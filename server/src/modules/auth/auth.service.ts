import { randomUUID } from "node:crypto";
import { prisma } from "../../database/prisma.js";
import { hashPassword, verifyPassword, generateSecureToken, hashToken } from "../../utils/crypto.js";
import { signAccessToken } from "../../utils/jwt.js";
import { AppError } from "../../utils/appError.js";
import { emailProvider } from "../../utils/emailProvider.js";
import { env } from "../../config/env.js";
import { SYSTEM_ROLES, ROLE_PERMISSION_MATRIX, SYSTEM_PERMISSIONS } from "../../database/rbac-definitions.js";
import { ensureDefaultPlans, getDefaultPlanDefinition } from "../billing/plans.catalog.js";
import type { RegisterInput, LoginInput, ResetPasswordInput } from "./auth.schema.js";

export class AuthService {
  /**
   * Atomic first-time registration and tenant provisioning
   */
  static async register(input: RegisterInput, userAgent?: string, ipAddress?: string) {
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. Check duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw AppError.conflict("An account with this email address already exists", "EMAIL_EXISTS");
    }

    // 2. Hash password with Argon2id
    const passwordHash = await hashPassword(input.password);

    // 3. Generate verification and refresh tokens
    const rawVerifyToken = generateSecureToken();
    const verifyTokenHash = hashToken(rawVerifyToken);

    const rawRefreshToken = generateSecureToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const refreshTokenFamily = randomUUID();

    const orgName = input.organizationName || `${input.firstName}'s Organization`;
    const orgSlug = `${orgName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${randomUUID().substring(0, 6)}`;

    // 4. Atomic database transaction provisioning User, Org, Workspace, Roles, Membership & Tokens
    const result = await prisma.$transaction(async (tx) => {
      // 4a. Create User
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          isEmailVerified: false,
        },
      });

      // 4b. Ensure SaaS Plans exist & Create Organization on 14-day Trial
      await ensureDefaultPlans(tx);
      const trialDef = getDefaultPlanDefinition("trial");
      const trialPlan = await tx.saaSPlan.findUnique({ where: { code: "trial" } });

      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug: orgSlug,
          plan: "trial",
          storageQuotaBytes: trialDef.storageQuotaBytes,
          isActive: true,
        },
      });

      if (trialPlan) {
        const now = new Date();
        const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        await tx.subscription.create({
          data: {
            organizationId: organization.id,
            planId: trialPlan.id,
            status: "TRIALING",
            billingCycle: "MONTHLY",
            seatCount: 1,
            trialEndsAt,
            currentPeriodStart: now,
            currentPeriodEnd: trialEndsAt,
          },
        });
      }

      // 4c. Create Default Workspace
      const workspace = await tx.workspace.create({
        data: {
          organizationId: organization.id,
          name: "Main Workspace",
          slug: "main",
          description: "Primary workspace for courses and interactive content",
        },
      });

      // 4d. Ensure standard permissions exist in database
      for (const perm of SYSTEM_PERMISSIONS) {
        await tx.permission.upsert({
          where: { code: perm.code },
          update: {},
          create: {
            code: perm.code,
            name: perm.name,
            category: perm.category,
            description: perm.description,
          },
        });
      }

      // 4e. Create system roles for the organization
      const ownerRole = await tx.role.create({
        data: {
          organizationId: organization.id,
          name: SYSTEM_ROLES.OWNER,
          description: "Full control over organization, members, and billing",
          isSystem: true,
        },
      });

      // Populate other standard roles
      for (const roleName of [SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.AUTHOR, SYSTEM_ROLES.REVIEWER, SYSTEM_ROLES.VIEWER]) {
        await tx.role.create({
          data: {
            organizationId: organization.id,
            name: roleName,
            description: `Standard ${roleName} role`,
            isSystem: true,
          },
        });
      }

      // Bind all permissions to OWNER role
      const allPermissions = await tx.permission.findMany();
      await tx.rolePermission.createMany({
        data: allPermissions.map((p) => ({
          roleId: ownerRole.id,
          permissionId: p.id,
        })),
      });

      // 4f. Assign User as active OWNER in OrganizationMember
      const membership = await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          roleId: ownerRole.id,
          status: "ACTIVE",
        },
      });

      // 4g. Create email verification token (valid 24h)
      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: verifyTokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // 4h. Create initial refresh token
      await tx.userRefreshToken.create({
        data: {
          userId: user.id,
          tokenHash: refreshTokenHash,
          family: refreshTokenFamily,
          userAgent,
          ipAddress,
          expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000),
        },
      });

      return { user, organization, workspace, membership, role: ownerRole, permissions: allPermissions.map((p) => p.code) };
    });

    // 5. Dispatch email verification message
    await emailProvider.sendEmail({
      to: normalizedEmail,
      subject: "Verify your email for SCORM & H5P Studio",
      text: `Welcome to SCORM & H5P Studio! Please verify your email with token: ${rawVerifyToken}`,
      html: `<p>Welcome to SCORM & H5P Studio!</p><p>Verification token: <code>${rawVerifyToken}</code></p>`,
    });

    // 6. Sign JWT access token bound to the newly provisioned tenant context
    const accessToken = signAccessToken({
      sub: result.user.id,
      email: result.user.email,
      isSuperAdmin: result.user.isSuperAdmin,
      orgId: result.organization.id,
      workspaceId: result.workspace.id,
      role: result.role.name,
      permissions: result.permissions,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        isEmailVerified: result.user.isEmailVerified,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        plan: result.organization.plan,
      },
      workspace: {
        id: result.workspace.id,
        name: result.workspace.name,
        slug: result.workspace.slug,
      },
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Secure user authentication with generic error reporting
   */
  static async login(input: LoginInput, userAgent?: string, ipAddress?: string) {
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. Fetch user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: {
            organization: true,
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Timing-resistant generic error message
    if (!user || !user.passwordHash) {
      throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    // 2. Verify password with Argon2id
    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    // 3. Resolve active organization context
    const primaryMembership = user.memberships[0];
    let workspaceId: string | undefined;

    if (primaryMembership) {
      const defaultWorkspace = await prisma.workspace.findFirst({
        where: { organizationId: primaryMembership.organizationId },
        orderBy: { createdAt: "asc" },
      });
      workspaceId = defaultWorkspace?.id;
    }

    // 4. Issue Refresh Token with new family
    const rawRefreshToken = generateSecureToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const refreshTokenFamily = randomUUID();

    await prisma.userRefreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        family: refreshTokenFamily,
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    // 5. Sign JWT access token
    const permissionCodes = primaryMembership
      ? primaryMembership.role.permissions.map((rp) => rp.permission.code)
      : [];

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      orgId: primaryMembership?.organizationId,
      workspaceId,
      role: primaryMembership?.role.name,
      permissions: permissionCodes,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
      },
      organization: primaryMembership
        ? {
            id: primaryMembership.organization.id,
            name: primaryMembership.organization.name,
            slug: primaryMembership.organization.slug,
            plan: primaryMembership.organization.plan,
          }
        : null,
      workspaceId,
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Token refresh with automatic rotation and family reuse detection
   */
  static async refresh(rawRefreshToken: string, userAgent?: string, ipAddress?: string) {
    const hashed = hashToken(rawRefreshToken);

    const storedToken = await prisma.userRefreshToken.findUnique({
      where: { tokenHash: hashed },
      include: {
        user: {
          include: {
            memberships: {
              where: { status: "ACTIVE" },
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!storedToken) {
      throw AppError.unauthorized("Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    // TOKEN REUSE DETECTION
    // If a revoked token is presented, a theft has occurred! Revoke the entire family immediately!
    if (storedToken.isRevoked) {
      await prisma.userRefreshToken.updateMany({
        where: { family: storedToken.family },
        data: { isRevoked: true },
      });

      throw AppError.unauthorized(
        "Token reuse detected. All sessions in this chain have been revoked for security.",
        "TOKEN_REUSE_DETECTED"
      );
    }

    // Check expiration
    if (storedToken.expiresAt < new Date()) {
      await prisma.userRefreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });
      throw AppError.unauthorized("Refresh token has expired", "REFRESH_TOKEN_EXPIRED");
    }

    // ROTATION: Revoke current token and issue new token in the same family
    const newRawRefreshToken = generateSecureToken();
    const newRefreshTokenHash = hashToken(newRawRefreshToken);

    await prisma.$transaction(async (tx) => {
      await tx.userRefreshToken.update({
        where: { id: storedToken.id },
        data: {
          isRevoked: true,
          replacedByTokenHash: newRefreshTokenHash,
        },
      });

      await tx.userRefreshToken.create({
        data: {
          userId: storedToken.userId,
          tokenHash: newRefreshTokenHash,
          family: storedToken.family,
          userAgent,
          ipAddress,
          expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000),
        },
      });
    });

    // Issue fresh access token
    const primaryMembership = storedToken.user.memberships[0];
    const permissions = primaryMembership
      ? primaryMembership.role.permissions.map((rp) => rp.permission.code)
      : [];

    const accessToken = signAccessToken({
      sub: storedToken.user.id,
      email: storedToken.user.email,
      isSuperAdmin: storedToken.user.isSuperAdmin,
      orgId: primaryMembership?.organizationId,
      role: primaryMembership?.role.name,
      permissions,
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  /**
   * Single session logout
   */
  static async logout(rawRefreshToken: string): Promise<void> {
    const hashed = hashToken(rawRefreshToken);
    await prisma.userRefreshToken.updateMany({
      where: { tokenHash: hashed },
      data: { isRevoked: true },
    });
  }

  /**
   * Logout from all devices for user
   */
  static async logoutAll(userId: string): Promise<void> {
    await prisma.userRefreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  /**
   * Forgot password request (zero user enumeration)
   */
  static async forgotPassword(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalized } });

    if (user) {
      const rawToken = generateSecureToken();
      const tokenHash = hashToken(rawToken);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      await emailProvider.sendEmail({
        to: normalized,
        subject: "Password Reset Request",
        text: `You requested a password reset. Token: ${rawToken}`,
        html: `<p>Password reset token: <code>${rawToken}</code></p>`,
      });
    }
  }

  /**
   * Password reset with session revocation
   */
  static async resetPassword(input: ResetPasswordInput): Promise<void> {
    const hashed = hashToken(input.token);

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashed },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.isUsed || resetRecord.expiresAt < new Date()) {
      throw AppError.badRequest("Invalid or expired password reset token", undefined, "INVALID_RESET_TOKEN");
    }

    const newPasswordHash = await hashPassword(input.newPassword);

    await prisma.$transaction(async (tx) => {
      // 1. Update user password
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash },
      });

      // 2. Invalidate reset token
      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { isUsed: true },
      });

      // 3. Revoke all active sessions (mandatory session revocation after password change!)
      await tx.userRefreshToken.updateMany({
        where: { userId: resetRecord.userId, isRevoked: false },
        data: { isRevoked: true },
      });
    });
  }

  /**
   * Email verification token acceptance
   */
  static async verifyEmail(rawToken: string): Promise<void> {
    const hashed = hashToken(rawToken);

    const verifyRecord = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashed },
    });

    if (!verifyRecord || verifyRecord.isUsed || verifyRecord.expiresAt < new Date()) {
      throw AppError.badRequest("Invalid or expired email verification token", undefined, "INVALID_VERIFY_TOKEN");
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: verifyRecord.userId },
        data: {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      await tx.emailVerificationToken.update({
        where: { id: verifyRecord.id },
        data: { isUsed: true },
      });
    });
  }
}
