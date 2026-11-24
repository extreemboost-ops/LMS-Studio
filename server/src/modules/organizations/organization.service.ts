import { randomUUID } from "node:crypto";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";
import { signAccessToken } from "../../utils/jwt.js";
import { SYSTEM_ROLES, SYSTEM_PERMISSIONS } from "../../database/rbac-definitions.js";
import type { CreateOrganizationInput } from "./organization.schema.js";

export class OrganizationService {
  /**
   * Lists all organizations where the user has an active membership
   */
  static async listUserOrganizations(userId: string) {
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId,
        status: "ACTIVE",
        organization: { isActive: true },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            storageQuotaBytes: true,
            createdAt: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role.name,
      joinedAt: m.joinedAt,
    }));
  }

  /**
   * Retrieves an organization by ID with membership check
   */
  static async getOrganizationById(organizationId: string, userId: string) {
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
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
    });

    if (!member || !member.organization.isActive || member.status !== "ACTIVE") {
      throw AppError.forbidden("Access denied: You are not a member of this organization", "TENANT_ACCESS_DENIED");
    }

    return {
      organization: member.organization,
      role: member.role.name,
      permissions: member.role.permissions.map((p) => p.permission.code),
    };
  }

  /**
   * Atomic creation of an organization with default workspace and OWNER role
   */
  static async createOrganization(userId: string, input: CreateOrganizationInput) {
    const baseSlug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const uniqueSlug = `${baseSlug}-${randomUUID().substring(0, 6)}`;

    return prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const org = await tx.organization.create({
        data: {
          name: input.name,
          slug: uniqueSlug,
          plan: "business",
          isActive: true,
        },
      });

      // 2. Create Default Workspace
      const workspace = await tx.workspace.create({
        data: {
          organizationId: org.id,
          name: "Main Workspace",
          slug: "main",
          description: "Primary workspace",
        },
      });

      // 3. Ensure permissions exist
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

      // 4. Create OWNER role
      const ownerRole = await tx.role.create({
        data: {
          organizationId: org.id,
          name: SYSTEM_ROLES.OWNER,
          description: "Full control over organization",
          isSystem: true,
        },
      });

      // Link all permissions to OWNER
      const allPermissions = await tx.permission.findMany();
      await tx.rolePermission.createMany({
        data: allPermissions.map((p) => ({
          roleId: ownerRole.id,
          permissionId: p.id,
        })),
      });

      // 5. Add user as OWNER member
      const member = await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          roleId: ownerRole.id,
          status: "ACTIVE",
        },
      });

      return {
        organization: org,
        workspace,
        role: ownerRole.name,
        permissions: allPermissions.map((p) => p.code),
      };
    });
  }

  /**
   * Switches the active organization context and issues a new access token
   */
  static async switchOrganization(userId: string, targetOrganizationId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.notFound("User");
    }

    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: targetOrganizationId,
          userId,
        },
      },
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
    });

    if (!member || !member.organization.isActive || member.status !== "ACTIVE") {
      throw AppError.forbidden("Access denied: You are not an active member of this organization", "TENANT_ACCESS_DENIED");
    }

    // Default workspace
    const workspace = await prisma.workspace.findFirst({
      where: { organizationId: targetOrganizationId },
      orderBy: { createdAt: "asc" },
    });

    const permissions = member.role.permissions.map((p) => p.permission.code);

    // Issue updated access token bound to the selected tenant
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      orgId: member.organizationId,
      workspaceId: workspace?.id,
      role: member.role.name,
      permissions,
    });

    return {
      organization: member.organization,
      workspace,
      accessToken,
      role: member.role.name,
      permissions,
    };
  }
}
