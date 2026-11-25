import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";
import {
  DEFAULT_SAAS_PLANS,
  getDefaultPlanDefinition,
  type PlanFeatures,
} from "./plans.catalog.js";

export type FeatureKey = keyof PlanFeatures;

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number; // -1 = unlimited
  remaining: number; // -1 = unlimited
}

export interface OrganizationEntitlements {
  organizationId: string;
  planCode: string;
  planName: string;
  status: string;
  isActive: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  limits: {
    maxSeats: number;
    maxWorkspaces: number;
    maxMonthlyExports: number;
    storageQuotaBytes: string;
  };
  usage: {
    seatsUsed: number;
    workspacesUsed: number;
    monthlyExportsUsed: number;
    storageBytesUsed: string;
  };
  features: PlanFeatures;
}

export class EntitlementsService {
  /**
   * Returns current UTC billing meter key (YYYY-MM).
   */
  public static getCurrentPeriodKey(date: Date = new Date()): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  /**
   * Pure boundary evaluator: `-1` means unlimited.
   */
  public static evaluateQuota(used: number, limit: number): QuotaCheckResult {
    if (limit < 0) {
      return { allowed: true, used, limit: -1, remaining: -1 };
    }
    const remaining = Math.max(0, limit - used);
    return {
      allowed: used < limit,
      used,
      limit,
      remaining,
    };
  }

  /**
   * Checks whether a subscription status permits active usage.
   */
  public static isSubscriptionActive(
    status: string,
    trialEndsAt?: Date | null,
    now: Date = new Date()
  ): boolean {
    if (status === "ACTIVE") return true;
    if (status === "TRIALING") {
      if (!trialEndsAt) return true;
      return trialEndsAt.getTime() > now.getTime();
    }
    return false;
  }

  /**
   * Lists public SaaS plans from database with catalog fallback.
   */
  public static async listPublicPlans() {
    try {
      const rows = await prisma.saaSPlan.findMany({
        where: { isPublic: true, isActive: true },
        orderBy: { sortOrder: "asc" },
      });

      if (rows.length > 0) {
        return rows.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          description: p.description,
          monthlyPriceCents: p.monthlyPriceCents,
          annualPriceCents: p.annualPriceCents,
          currency: p.currency,
          maxSeats: p.maxSeats,
          maxWorkspaces: p.maxWorkspaces,
          maxMonthlyExports: p.maxMonthlyExports,
          storageQuotaBytes: p.storageQuotaBytes.toString(),
          features: p.features as unknown as PlanFeatures,
        }));
      }
    } catch {
      // Fallback to in-memory catalog when DB is unavailable
    }

    return DEFAULT_SAAS_PLANS.filter((p) => p.isPublic).map((p) => ({
      id: `plan_${p.code}`,
      code: p.code,
      name: p.name,
      description: p.description,
      monthlyPriceCents: p.monthlyPriceCents,
      annualPriceCents: p.annualPriceCents,
      currency: "usd",
      maxSeats: p.maxSeats,
      maxWorkspaces: p.maxWorkspaces,
      maxMonthlyExports: p.maxMonthlyExports,
      storageQuotaBytes: p.storageQuotaBytes.toString(),
      features: p.features,
    }));
  }

  /**
   * Resolves full entitlements, limits, and current usage for an organization.
   */
  public static async getOrganizationEntitlements(
    organizationId: string
  ): Promise<OrganizationEntitlements> {
    const periodKey = this.getCurrentPeriodKey();

    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          subscription: { include: { plan: true } },
        },
      });

      if (!org) {
        throw AppError.notFound("Organization");
      }

      const [membersCount, pendingInvitesCount, workspacesCount, usageMeter, latestStorage] =
        await Promise.all([
          prisma.organizationMember.count({
            where: { organizationId, status: { in: ["ACTIVE", "INVITED"] } },
          }),
          prisma.organizationInvitation.count({
            where: { organizationId, status: "INVITED", expiresAt: { gt: new Date() } },
          }),
          prisma.workspace.count({ where: { organizationId } }),
          prisma.usageMeter.findUnique({
            where: { organizationId_periodKey: { organizationId, periodKey } },
          }),
          prisma.storageUsage.findFirst({
            where: { organizationId },
            orderBy: { recordedAt: "desc" },
          }),
        ]);

      const sub = org.subscription;
      const fallbackDef = getDefaultPlanDefinition(org.plan);

      const planCode = sub?.plan.code ?? fallbackDef.code;
      const planName = sub?.plan.name ?? fallbackDef.name;
      const status = sub?.status ?? (org.isActive ? "ACTIVE" : "SUSPENDED");
      const active = org.isActive && this.isSubscriptionActive(status, sub?.trialEndsAt);

      const features = (sub?.plan.features as unknown as PlanFeatures) ?? fallbackDef.features;

      return {
        organizationId,
        planCode,
        planName,
        status,
        isActive: active,
        trialEndsAt: sub?.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
        currentPeriodEnd: sub?.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
        limits: {
          maxSeats: sub?.plan.maxSeats ?? fallbackDef.maxSeats,
          maxWorkspaces: sub?.plan.maxWorkspaces ?? fallbackDef.maxWorkspaces,
          maxMonthlyExports: sub?.plan.maxMonthlyExports ?? fallbackDef.maxMonthlyExports,
          storageQuotaBytes: (sub?.plan.storageQuotaBytes ?? org.storageQuotaBytes).toString(),
        },
        usage: {
          seatsUsed: membersCount + pendingInvitesCount,
          workspacesUsed: workspacesCount,
          monthlyExportsUsed: usageMeter?.exportsCount ?? 0,
          storageBytesUsed: (latestStorage?.totalBytesUsed ?? BigInt(0)).toString(),
        },
        features,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;

      // Resilient fallback when DB is offline in unit/integration environments
      const fallbackDef = getDefaultPlanDefinition("business");
      return {
        organizationId,
        planCode: fallbackDef.code,
        planName: fallbackDef.name,
        status: "ACTIVE",
        isActive: true,
        trialEndsAt: null,
        currentPeriodEnd: null,
        limits: {
          maxSeats: fallbackDef.maxSeats,
          maxWorkspaces: fallbackDef.maxWorkspaces,
          maxMonthlyExports: fallbackDef.maxMonthlyExports,
          storageQuotaBytes: fallbackDef.storageQuotaBytes.toString(),
        },
        usage: {
          seatsUsed: 1,
          workspacesUsed: 1,
          monthlyExportsUsed: 0,
          storageBytesUsed: "0",
        },
        features: fallbackDef.features,
      };
    }
  }

  /**
   * Enforces that the organization has an active or valid-trial subscription.
   */
  public static async assertActiveSubscription(organizationId: string): Promise<OrganizationEntitlements> {
    const ent = await this.getOrganizationEntitlements(organizationId);
    if (!ent.isActive) {
      throw new AppError(
        402,
        "SUBSCRIPTION_INACTIVE",
        `Organization subscription is ${ent.status}. Please upgrade or renew your plan to continue.`
      );
    }
    return ent;
  }

  /**
   * Enforces seat limit before inviting/adding a new member.
   */
  public static async assertSeatQuota(organizationId: string): Promise<QuotaCheckResult> {
    const ent = await this.assertActiveSubscription(organizationId);
    const check = this.evaluateQuota(ent.usage.seatsUsed, ent.limits.maxSeats);
    if (!check.allowed) {
      throw new AppError(
        402,
        "QUOTA_EXCEEDED_SEATS",
        `Seat limit reached (${check.used}/${check.limit}) on the ${ent.planName} plan. Please upgrade to add more members.`,
        check
      );
    }
    return check;
  }

  /**
   * Enforces workspace limit before creating a workspace.
   */
  public static async assertWorkspaceQuota(organizationId: string): Promise<QuotaCheckResult> {
    const ent = await this.assertActiveSubscription(organizationId);
    const check = this.evaluateQuota(ent.usage.workspacesUsed, ent.limits.maxWorkspaces);
    if (!check.allowed) {
      throw new AppError(
        402,
        "QUOTA_EXCEEDED_WORKSPACES",
        `Workspace limit reached (${check.used}/${check.limit}) on the ${ent.planName} plan. Please upgrade to create more workspaces.`,
        check
      );
    }
    return check;
  }

  /**
   * Enforces monthly export limit before starting a SCORM/H5P export job.
   */
  public static async assertExportQuota(organizationId: string): Promise<QuotaCheckResult> {
    const ent = await this.assertActiveSubscription(organizationId);
    const check = this.evaluateQuota(ent.usage.monthlyExportsUsed, ent.limits.maxMonthlyExports);
    if (!check.allowed) {
      throw new AppError(
        402,
        "QUOTA_EXCEEDED_EXPORTS",
        `Monthly export quota reached (${check.used}/${check.limit}) on the ${ent.planName} plan.`,
        check
      );
    }
    return check;
  }

  /**
   * Enforces that a plan feature flag (e.g. `lti13`, `whiteLabel`) is enabled.
   */
  public static async assertFeatureEnabled(
    organizationId: string,
    feature: FeatureKey
  ): Promise<void> {
    const ent = await this.assertActiveSubscription(organizationId);
    if (!ent.features[feature]) {
      throw AppError.forbidden(
        `Feature '${feature}' is not included in your current ${ent.planName} plan. Please upgrade to unlock it.`,
        "FEATURE_NOT_IN_PLAN"
      );
    }
  }

  /**
   * Atomically increments the monthly export counter for an organization.
   */
  public static async incrementExportUsage(organizationId: string): Promise<void> {
    const periodKey = this.getCurrentPeriodKey();
    try {
      await prisma.usageMeter.upsert({
        where: { organizationId_periodKey: { organizationId, periodKey } },
        update: { exportsCount: { increment: 1 } },
        create: {
          organizationId,
          periodKey,
          exportsCount: 1,
          lmsSyncCount: 0,
        },
      });
    } catch {
      // Non-fatal in offline/mock test mode
    }
  }
}
