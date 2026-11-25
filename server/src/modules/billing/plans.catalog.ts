import type { PrismaClient } from "@prisma/client";

export interface PlanFeatures {
  lti13: boolean;
  whiteLabel: boolean;
  analyticsCsv: boolean;
  scorm2004: boolean;
  h5pImport: boolean;
}

export interface SaaSPlanDefinition {
  code: "trial" | "starter" | "pro" | "business" | "enterprise";
  name: string;
  description: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  maxSeats: number; // -1 = unlimited
  maxWorkspaces: number; // -1 = unlimited
  maxMonthlyExports: number; // -1 = unlimited
  storageQuotaBytes: bigint;
  features: PlanFeatures;
  isPublic: boolean;
  sortOrder: number;
}

export const DEFAULT_SAAS_PLANS: SaaSPlanDefinition[] = [
  {
    code: "trial",
    name: "14-Day Free Trial",
    description: "Explore interactive H5P and SCORM authoring with core export capabilities.",
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    maxSeats: 3,
    maxWorkspaces: 1,
    maxMonthlyExports: 10,
    storageQuotaBytes: BigInt(1073741824), // 1 GB
    features: {
      lti13: false,
      whiteLabel: false,
      analyticsCsv: false,
      scorm2004: true,
      h5pImport: true,
    },
    isPublic: false,
    sortOrder: 0,
  },
  {
    code: "starter",
    name: "Starter",
    description: "For solo instructional designers and small training teams.",
    monthlyPriceCents: 2900, // $29/mo
    annualPriceCents: 29000, // $290/yr
    maxSeats: 5,
    maxWorkspaces: 2,
    maxMonthlyExports: 50,
    storageQuotaBytes: BigInt(5368709120), // 5 GB
    features: {
      lti13: false,
      whiteLabel: false,
      analyticsCsv: true,
      scorm2004: true,
      h5pImport: true,
    },
    isPublic: true,
    sortOrder: 1,
  },
  {
    code: "pro",
    name: "Pro Studio",
    description: "Full LTI 1.3 LMS integration, high-volume exports, and team workspaces.",
    monthlyPriceCents: 7900, // $79/mo
    annualPriceCents: 79000, // $790/yr
    maxSeats: 20,
    maxWorkspaces: 10,
    maxMonthlyExports: 300,
    storageQuotaBytes: BigInt(53687091200), // 50 GB
    features: {
      lti13: true,
      whiteLabel: false,
      analyticsCsv: true,
      scorm2004: true,
      h5pImport: true,
    },
    isPublic: true,
    sortOrder: 2,
  },
  {
    code: "business",
    name: "Business",
    description: "For growing L&D departments requiring multi-workspace governance.",
    monthlyPriceCents: 19900, // $199/mo
    annualPriceCents: 199000, // $1,990/yr
    maxSeats: 75,
    maxWorkspaces: 30,
    maxMonthlyExports: 1500,
    storageQuotaBytes: BigInt(107374182400), // 100 GB
    features: {
      lti13: true,
      whiteLabel: true,
      analyticsCsv: true,
      scorm2004: true,
      h5pImport: true,
    },
    isPublic: true,
    sortOrder: 3,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    description: "Unlimited scale, custom white-label domains, and dedicated SLA.",
    monthlyPriceCents: 49900, // $499/mo
    annualPriceCents: 499000, // $4,990/yr
    maxSeats: -1,
    maxWorkspaces: -1,
    maxMonthlyExports: -1,
    storageQuotaBytes: BigInt(1099511627776), // 1 TB
    features: {
      lti13: true,
      whiteLabel: true,
      analyticsCsv: true,
      scorm2004: true,
      h5pImport: true,
    },
    isPublic: true,
    sortOrder: 4,
  },
];

export function getDefaultPlanDefinition(code: string): SaaSPlanDefinition {
  return (
    DEFAULT_SAAS_PLANS.find((p) => p.code === code) ||
    DEFAULT_SAAS_PLANS.find((p) => p.code === "business")!
  );
}

/**
 * Idempotently seeds or updates the default SaaS plans in PostgreSQL.
 */
export async function ensureDefaultPlans(
  client: Pick<PrismaClient, "saaSPlan">
): Promise<void> {
  for (const plan of DEFAULT_SAAS_PLANS) {
    await client.saaSPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPriceCents: plan.monthlyPriceCents,
        annualPriceCents: plan.annualPriceCents,
        maxSeats: plan.maxSeats,
        maxWorkspaces: plan.maxWorkspaces,
        maxMonthlyExports: plan.maxMonthlyExports,
        storageQuotaBytes: plan.storageQuotaBytes,
        features: plan.features as unknown as Record<string, boolean>,
        isPublic: plan.isPublic,
        sortOrder: plan.sortOrder,
      },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        monthlyPriceCents: plan.monthlyPriceCents,
        annualPriceCents: plan.annualPriceCents,
        maxSeats: plan.maxSeats,
        maxWorkspaces: plan.maxWorkspaces,
        maxMonthlyExports: plan.maxMonthlyExports,
        storageQuotaBytes: plan.storageQuotaBytes,
        features: plan.features as unknown as Record<string, boolean>,
        isPublic: plan.isPublic,
        isActive: true,
        sortOrder: plan.sortOrder,
      },
    });
  }
}
