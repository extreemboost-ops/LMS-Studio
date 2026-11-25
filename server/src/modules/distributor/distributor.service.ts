import { randomUUID } from "node:crypto";
import { prisma } from "../../database/prisma.js";
import { withDistributorTransaction } from "../../database/rls.js";
import { AppError } from "../../utils/appError.js";
import { generateSecureToken, hashToken } from "../../utils/crypto.js";
import { SYSTEM_ROLES, SYSTEM_PERMISSIONS } from "../../database/rbac-definitions.js";
import { ensureDefaultPlans, getDefaultPlanDefinition } from "../billing/plans.catalog.js";
import { LicenseService } from "../billing/license.service.js";
import type {
  ApplyDistributorInput,
  ReviewDistributorInput,
  ProvisionClientInput,
  GeneratePartnerLicensesInput,
  RequestPayoutInput,
} from "./distributor.schema.js";

export class DistributorService {
  /**
   * Pure financial math helper for partner commission calculation (integer cents).
   */
  public static calculateCommissionCents(
    grossAmountCents: number,
    commissionPercent: number
  ): number {
    if (grossAmountCents <= 0 || commissionPercent <= 0) return 0;
    return Math.round((grossAmountCents * commissionPercent) / 100);
  }

  /**
   * Submits a new Distributor/Partner application and binds the applicant as PARTNER_OWNER.
   */
  public static async applyForPartnership(userId: string, input: ApplyDistributorInput) {
    const slugBase = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const slug = `${slugBase || "partner"}-${randomUUID().slice(0, 6)}`;

    return prisma.$transaction(async (tx) => {
      const existingMembership = await tx.distributorMember.findFirst({
        where: { userId },
      });
      if (existingMembership) {
        throw AppError.conflict(
          "This user is already associated with a Distributor account",
          "DISTRIBUTOR_ALREADY_EXISTS"
        );
      }

      const distributor = await tx.distributor.create({
        data: {
          name: input.name,
          slug,
          status: "PENDING",
          billingMode: input.billingMode,
          contactEmail: input.contactEmail.trim().toLowerCase(),
          companyWebsite: input.companyWebsite || null,
        },
      });

      await tx.distributorMember.create({
        data: {
          distributorId: distributor.id,
          userId,
          role: "PARTNER_OWNER",
          status: "ACTIVE",
        },
      });

      return distributor;
    });
  }

  /**
   * Super Admin reviews and approves/suspends a Distributor application.
   */
  public static async reviewPartnerApplication(
    distributorId: string,
    input: ReviewDistributorInput
  ) {
    const existing = await prisma.distributor.findUnique({ where: { id: distributorId } });
    if (!existing) {
      throw AppError.notFound("Distributor");
    }

    return prisma.distributor.update({
      where: { id: distributorId },
      data: {
        status: input.status,
        ...(input.commissionPercent !== undefined
          ? { commissionPercent: input.commissionPercent }
          : {}),
        ...(input.wholesaleDiscountPercent !== undefined
          ? { wholesaleDiscountPercent: input.wholesaleDiscountPercent }
          : {}),
        ...(input.seatPoolTotal !== undefined ? { seatPoolTotal: input.seatPoolTotal } : {}),
      },
    });
  }

  /**
   * Lists all Distributors (Super Admin only).
   */
  public static async listAllDistributors() {
    return prisma.distributor.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { organizations: true, licenseKeys: true, members: true },
        },
      },
    });
  }

  /**
   * Returns Distributor Hub KPIs within RLS-scoped transaction.
   */
  public static async getDashboard(distributorId: string) {
    return withDistributorTransaction(distributorId, async (tx) => {
      const distributor = await tx.distributor.findUnique({
        where: { id: distributorId },
      });
      if (!distributor) {
        throw AppError.notFound("Distributor");
      }

      const [clientsCount, activeClientsCount, unusedLicensesCount, commissions, payouts] =
        await Promise.all([
          tx.organization.count({ where: { distributorId } }),
          tx.organization.count({ where: { distributorId, isActive: true } }),
          tx.licenseKey.count({ where: { distributorId, status: "UNUSED" } }),
          tx.commissionLedger.findMany({ where: { distributorId } }),
          tx.payoutRequest.findMany({ where: { distributorId } }),
        ]);

      const totalEarnedCents = commissions
        .filter((c) => c.status !== "CLAWBACK")
        .reduce((sum, c) => sum + c.commissionCents, 0);

      const committedPayoutCents = payouts
        .filter((p) => p.status !== "REJECTED")
        .reduce((sum, p) => sum + p.amountCents, 0);

      const availableBalanceCents = Math.max(0, totalEarnedCents - committedPayoutCents);

      return {
        distributor: {
          id: distributor.id,
          name: distributor.name,
          slug: distributor.slug,
          status: distributor.status,
          billingMode: distributor.billingMode,
          commissionPercent: Number(distributor.commissionPercent),
          seatPoolTotal: distributor.seatPoolTotal,
          seatPoolUsed: distributor.seatPoolUsed,
          customDomain: distributor.customDomain,
        },
        kpis: {
          totalClients: clientsCount,
          activeClients: activeClientsCount,
          unusedLicenses: unusedLicensesCount,
          totalEarnedCents,
          availableBalanceCents,
        },
      };
    });
  }

  /**
   * Lists client Organizations strictly belonging to this Distributor (RLS-isolated).
   */
  public static async listClients(distributorId: string) {
    return withDistributorTransaction(distributorId, async (tx) => {
      const orgs = await tx.organization.findMany({
        where: { distributorId },
        orderBy: { createdAt: "desc" },
        include: {
          subscription: { include: { plan: { select: { code: true, name: true } } } },
          _count: { select: { members: true, workspaces: true, scormPackages: true } },
        },
      });

      return orgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        plan: o.plan,
        isActive: o.isActive,
        storageQuotaBytes: o.storageQuotaBytes.toString(),
        subscriptionStatus: o.subscription?.status ?? "ACTIVE",
        seatCount: o.subscription?.seatCount ?? 5,
        currentPeriodEnd: o.subscription?.currentPeriodEnd ?? null,
        membersCount: o._count.members,
        workspacesCount: o._count.workspaces,
        packagesCount: o._count.scormPackages,
        createdAt: o.createdAt,
      }));
    });
  }

  /**
   * Atomically provisions a new Client Organization under this Distributor.
   */
  public static async provisionClient(
    distributorId: string,
    provisionedByUserId: string,
    input: ProvisionClientInput
  ) {
    const normalizedEmail = input.ownerEmail.trim().toLowerCase();

    return withDistributorTransaction(distributorId, async (tx) => {
      const distributor = await tx.distributor.findUnique({ where: { id: distributorId } });
      if (!distributor || distributor.status !== "ACTIVE") {
        throw AppError.forbidden("Distributor account must be ACTIVE to provision clients");
      }

      if (distributor.billingMode === "WHOLESALE_POOL") {
        const remaining = distributor.seatPoolTotal - distributor.seatPoolUsed;
        if (remaining < input.seatCount) {
          throw new AppError(
            402,
            "DISTRIBUTOR_SEAT_POOL_EXCEEDED",
            `Insufficient distributor seat pool (${remaining} remaining, ${input.seatCount} requested).`
          );
        }
        await tx.distributor.update({
          where: { id: distributorId },
          data: { seatPoolUsed: { increment: input.seatCount } },
        });
      }

      await ensureDefaultPlans(tx);
      const plan = await tx.saaSPlan.findUnique({ where: { code: input.planCode } });
      const planDef = getDefaultPlanDefinition(input.planCode);
      if (!plan) {
        throw AppError.notFound(`SaaSPlan (${input.planCode})`);
      }

      const slugBase = input.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const orgSlug = `${slugBase || "client"}-${randomUUID().slice(0, 6)}`;

      const org = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug: orgSlug,
          plan: plan.code,
          storageQuotaBytes: plan.storageQuotaBytes ?? planDef.storageQuotaBytes,
          isActive: true,
          distributorId,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          organizationId: org.id,
          name: "Main Workspace",
          slug: "main",
          description: "Provisioned workspace for courses and interactive content",
        },
      });

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

      const ownerRole = await tx.role.create({
        data: {
          organizationId: org.id,
          name: SYSTEM_ROLES.OWNER,
          description: "Full control over organization, members, and billing",
          isSystem: true,
        },
      });

      for (const roleName of [
        SYSTEM_ROLES.ADMIN,
        SYSTEM_ROLES.AUTHOR,
        SYSTEM_ROLES.REVIEWER,
        SYSTEM_ROLES.VIEWER,
      ]) {
        await tx.role.create({
          data: {
            organizationId: org.id,
            name: roleName,
            description: `Standard ${roleName} role`,
            isSystem: true,
          },
        });
      }

      const allPerms = await tx.permission.findMany();
      await tx.rolePermission.createMany({
        data: allPerms.map((p) => ({ roleId: ownerRole.id, permissionId: p.id })),
      });

      const now = new Date();
      const periodEnd = new Date(now.getTime() + input.durationDays * 24 * 60 * 60 * 1000);
      const subscription = await tx.subscription.create({
        data: {
          organizationId: org.id,
          planId: plan.id,
          distributorId,
          status: "ACTIVE",
          billingCycle: "ANNUAL",
          seatCount: input.seatCount,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      const existingUser = await tx.user.findUnique({ where: { email: normalizedEmail } });
      let invitationToken: string | null = null;

      if (existingUser) {
        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: existingUser.id,
            roleId: ownerRole.id,
            status: "ACTIVE",
          },
        });
      } else {
        invitationToken = generateSecureToken(24);
        await tx.organizationInvitation.create({
          data: {
            organizationId: org.id,
            email: normalizedEmail,
            roleId: ownerRole.id,
            invitedById: provisionedByUserId,
            tokenHash: hashToken(invitationToken),
            status: "INVITED",
            expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }

      return {
        organization: { id: org.id, name: org.name, slug: org.slug, plan: org.plan },
        workspace: { id: workspace.id, name: workspace.name },
        subscription: { id: subscription.id, status: subscription.status, seatCount: subscription.seatCount },
        ownerAttached: Boolean(existingUser),
        invitationIssued: !existingUser,
      };
    });
  }

  /**
   * Suspends or reactivates a client Organization strictly owned by this Distributor.
   */
  public static async setClientStatus(
    distributorId: string,
    clientOrgId: string,
    isActive: boolean
  ) {
    return withDistributorTransaction(distributorId, async (tx) => {
      const org = await tx.organization.findFirst({
        where: { id: clientOrgId, distributorId },
      });

      if (!org) {
        throw AppError.forbidden(
          "Client organization not found or does not belong to this Distributor",
          "CROSS_DISTRIBUTOR_FORBIDDEN"
        );
      }

      const updated = await tx.organization.update({
        where: { id: org.id },
        data: { isActive },
      });

      await tx.subscription.updateMany({
        where: { organizationId: org.id, distributorId },
        data: { status: isActive ? "ACTIVE" : "SUSPENDED" },
      });

      return updated;
    });
  }

  /**
   * Generates a batch of Distributor-attributed single-use license keys.
   */
  public static async generatePartnerLicenses(
    distributorId: string,
    userId: string,
    input: GeneratePartnerLicensesInput
  ) {
    return withDistributorTransaction(distributorId, async (tx) => {
      await ensureDefaultPlans(tx);
      const plan = await tx.saaSPlan.findUnique({ where: { code: input.planCode } });
      if (!plan) {
        throw AppError.notFound(`SaaSPlan (${input.planCode})`);
      }

      const issued = [];
      for (let i = 0; i < input.count; i++) {
        const rawCode = LicenseService.formatLicenseKey(plan.code);
        const record = await tx.licenseKey.create({
          data: {
            codeHash: LicenseService.hashLicenseCode(rawCode),
            codePrefix: rawCode.slice(0, 12),
            planId: plan.id,
            distributorId,
            seatCount: input.seatCount,
            durationDays: input.durationDays,
            status: "UNUSED",
            issuedByUserId: userId,
            notes: input.notes || null,
          },
        });
        issued.push({
          id: record.id,
          code: rawCode,
          codePrefix: record.codePrefix,
          planCode: plan.code,
          seatCount: record.seatCount,
          durationDays: record.durationDays,
        });
      }
      return issued;
    });
  }

  /**
   * Lists commission ledger entries and payouts for the Distributor.
   */
  public static async listCommissionsAndPayouts(distributorId: string) {
    return withDistributorTransaction(distributorId, async (tx) => {
      const [commissions, payouts] = await Promise.all([
        tx.commissionLedger.findMany({
          where: { distributorId },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        tx.payoutRequest.findMany({
          where: { distributorId },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ]);
      return { commissions, payouts };
    });
  }

  /**
   * Submits a payout request against available commission balance.
   */
  public static async requestPayout(
    distributorId: string,
    userId: string,
    input: RequestPayoutInput
  ) {
    return withDistributorTransaction(distributorId, async (tx) => {
      const [commissions, payouts] = await Promise.all([
        tx.commissionLedger.findMany({ where: { distributorId } }),
        tx.payoutRequest.findMany({ where: { distributorId } }),
      ]);

      const earned = commissions
        .filter((c) => c.status !== "CLAWBACK")
        .reduce((s, c) => s + c.commissionCents, 0);
      const committed = payouts
        .filter((p) => p.status !== "REJECTED")
        .reduce((s, p) => s + p.amountCents, 0);

      const available = Math.max(0, earned - committed);
      if (input.amountCents > available) {
        throw AppError.badRequest(
          `Requested payout (${input.amountCents} cents) exceeds available commission balance (${available} cents).`,
          undefined,
          "INSUFFICIENT_COMMISSION_BALANCE"
        );
      }

      return tx.payoutRequest.create({
        data: {
          distributorId,
          requestedByUserId: userId,
          amountCents: input.amountCents,
          status: "REQUESTED",
          referenceNote: input.referenceNote || null,
        },
      });
    });
  }

  /**
   * Super Admin Global SaaS Command Center Overview (MRR, Tenants, Payout Queue).
   */
  public static async getAdminPlatformOverview() {
    const [totalOrgs, activeSubs, distributors, payoutRequests, recentOrgs] = await Promise.all([
      prisma.organization.count(),
      prisma.subscription.findMany({
        where: { status: { in: ["ACTIVE", "TRIALING"] } },
        include: { plan: { select: { code: true, name: true, monthlyPriceCents: true, annualPriceCents: true } } },
      }),
      prisma.distributor.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { organizations: true, licenseKeys: true } } },
      }),
      prisma.payoutRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { distributor: { select: { name: true, slug: true } } },
      }),
      prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        take: 25,
        include: {
          distributor: { select: { name: true } },
          subscription: { select: { status: true, billingCycle: true, seatCount: true } },
        },
      }),
    ]);

    let estimatedMrrCents = 0;
    for (const s of activeSubs) {
      if (s.status === "ACTIVE") {
        estimatedMrrCents +=
          s.billingCycle === "ANNUAL"
            ? Math.round(s.plan.annualPriceCents / 12)
            : s.plan.monthlyPriceCents;
      }
    }

    const pendingPayoutsCents = payoutRequests
      .filter((p) => p.status === "REQUESTED" || p.status === "APPROVED")
      .reduce((sum, p) => sum + p.amountCents, 0);

    return {
      metrics: {
        totalOrganizations: totalOrgs,
        activeSubscriptions: activeSubs.filter((s) => s.status === "ACTIVE").length,
        trialingSubscriptions: activeSubs.filter((s) => s.status === "TRIALING").length,
        totalDistributors: distributors.length,
        pendingApplications: distributors.filter((d) => d.status === "PENDING").length,
        estimatedMrrCents,
        pendingPayoutsCents,
      },
      distributors,
      payoutRequests,
      recentOrganizations: recentOrgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        plan: o.plan,
        isActive: o.isActive,
        distributorName: o.distributor?.name || "Direct SaaS",
        subscriptionStatus: o.subscription?.status || "ACTIVE",
        seatCount: o.subscription?.seatCount || 1,
        createdAt: o.createdAt,
      })),
    };
  }

  /**
   * Super Admin approves, marks paid, or rejects a Distributor PayoutRequest.
   */
  public static async processPayoutRequest(
    payoutId: string,
    status: "APPROVED" | "PAID" | "REJECTED",
    referenceNote?: string
  ) {
    const existing = await prisma.payoutRequest.findUnique({ where: { id: payoutId } });
    if (!existing) {
      throw AppError.notFound("PayoutRequest");
    }

    return prisma.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status,
        ...(referenceNote ? { referenceNote } : {}),
        ...(status === "PAID" || status === "REJECTED" ? { processedAt: new Date() } : {}),
      },
    });
  }
}
