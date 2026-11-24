import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";
import { generateSecureToken, hashToken } from "../../utils/crypto.js";
import { emailProvider } from "../../utils/emailProvider.js";
import type { InviteMemberInput, AcceptInvitationInput } from "./member.schema.js";

export class MemberService {
  /**
   * Lists all active and invited members of an organization
   */
  static async listMembers(organizationId: string) {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const pendingInvitations = await prisma.organizationInvitation.findMany({
      where: { organizationId, status: "INVITED" },
      include: {
        role: { select: { id: true, name: true } },
        invitedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return {
      members: members.map((m) => ({
        id: m.id,
        user: m.user,
        role: m.role.name,
        roleId: m.roleId,
        status: m.status,
        joinedAt: m.joinedAt,
      })),
      pendingInvitations: pendingInvitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role.name,
        status: inv.status,
        expiresAt: inv.expiresAt,
        invitedBy: `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`,
      })),
    };
  }

  /**
   * Invites a new member to the organization
   */
  static async inviteMember(organizationId: string, invitedById: string, input: InviteMemberInput) {
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. Verify role belongs to organization or is system role
    const role = await prisma.role.findFirst({
      where: {
        id: input.roleId,
        OR: [{ organizationId }, { organizationId: null }],
      },
    });

    if (!role) {
      throw AppError.badRequest("Invalid role specified for this organization", undefined, "INVALID_ROLE");
    }

    // 2. Check if user is already an active member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        user: { email: normalizedEmail },
      },
    });

    if (existingMember) {
      throw AppError.conflict("User is already a member of this organization", "ALREADY_MEMBER");
    }

    // 3. Create or update invitation token
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.organizationInvitation.upsert({
      where: {
        organizationId_email: {
          organizationId,
          email: normalizedEmail,
        },
      },
      update: {
        roleId: role.id,
        invitedById,
        tokenHash,
        status: "INVITED",
        expiresAt,
      },
      create: {
        organizationId,
        email: normalizedEmail,
        roleId: role.id,
        invitedById,
        tokenHash,
        status: "INVITED",
        expiresAt,
      },
      include: {
        organization: { select: { name: true } },
      },
    });

    // 4. Send invitation email
    await emailProvider.sendEmail({
      to: normalizedEmail,
      subject: `Invitation to join ${invitation.organization.name}`,
      text: `You have been invited to join ${invitation.organization.name} as ${role.name}. Acceptance token: ${rawToken}`,
      html: `<p>You have been invited to join <b>${invitation.organization.name}</b> as <b>${role.name}</b>.</p><p>Token: <code>${rawToken}</code></p>`,
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: role.name,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Accepts an invitation and provisions active membership
   */
  static async acceptInvitation(userId: string, input: AcceptInvitationInput) {
    const hashed = hashToken(input.token);

    const invitation = await prisma.organizationInvitation.findUnique({
      where: { tokenHash: hashed },
      include: { organization: true, role: true },
    });

    if (!invitation || invitation.status !== "INVITED" || invitation.expiresAt < new Date()) {
      throw AppError.badRequest("Invalid or expired invitation token", undefined, "INVALID_INVITATION");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw AppError.notFound("User");
    }

    // Verify email match (or allow acceptance if signed in with same email)
    if (invitation.email !== user.email) {
      throw AppError.forbidden("Invitation was issued to a different email address", "EMAIL_MISMATCH");
    }

    return prisma.$transaction(async (tx) => {
      // Create active member
      const member = await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          roleId: invitation.roleId,
          status: "ACTIVE",
        },
      });

      // Invalidate invitation
      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACTIVE" },
      });

      return {
        membershipId: member.id,
        organizationId: invitation.organizationId,
        organizationName: invitation.organization.name,
        role: invitation.role.name,
      };
    });
  }
}
