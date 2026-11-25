import { ApiClient, type ApiResponse } from "./api-client";

export interface PlanFeaturesDto {
  lti13: boolean;
  whiteLabel: boolean;
  analyticsCsv: boolean;
  scorm2004: boolean;
  h5pImport: boolean;
}

export interface SaaSPlanDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPriceCents: number;
  annualPriceCents: number;
  currency: string;
  maxSeats: number;
  maxWorkspaces: number;
  maxMonthlyExports: number;
  storageQuotaBytes: string;
  features: PlanFeaturesDto;
}

export interface OrganizationEntitlementsDto {
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
  features: PlanFeaturesDto;
}

const FALLBACK_PLANS: SaaSPlanDto[] = [
  {
    id: "plan_starter",
    code: "starter",
    name: "Starter",
    description: "For solo instructional designers and small training teams.",
    monthlyPriceCents: 2900,
    annualPriceCents: 29000,
    currency: "usd",
    maxSeats: 5,
    maxWorkspaces: 2,
    maxMonthlyExports: 50,
    storageQuotaBytes: "5368709120",
    features: { lti13: false, whiteLabel: false, analyticsCsv: true, scorm2004: true, h5pImport: true },
  },
  {
    id: "plan_pro",
    code: "pro",
    name: "Pro Studio",
    description: "Full LTI 1.3 LMS integration, high-volume exports, and team workspaces.",
    monthlyPriceCents: 7900,
    annualPriceCents: 79000,
    currency: "usd",
    maxSeats: 20,
    maxWorkspaces: 10,
    maxMonthlyExports: 300,
    storageQuotaBytes: "53687091200",
    features: { lti13: true, whiteLabel: false, analyticsCsv: true, scorm2004: true, h5pImport: true },
  },
  {
    id: "plan_business",
    code: "business",
    name: "Business",
    description: "For growing L&D departments requiring multi-workspace governance.",
    monthlyPriceCents: 19900,
    annualPriceCents: 199000,
    currency: "usd",
    maxSeats: 75,
    maxWorkspaces: 30,
    maxMonthlyExports: 1500,
    storageQuotaBytes: "107374182400",
    features: { lti13: true, whiteLabel: true, analyticsCsv: true, scorm2004: true, h5pImport: true },
  },
  {
    id: "plan_enterprise",
    code: "enterprise",
    name: "Enterprise",
    description: "Unlimited scale, custom white-label domains, and dedicated SLA.",
    monthlyPriceCents: 49900,
    annualPriceCents: 499000,
    currency: "usd",
    maxSeats: -1,
    maxWorkspaces: -1,
    maxMonthlyExports: -1,
    storageQuotaBytes: "1099511627776",
    features: { lti13: true, whiteLabel: true, analyticsCsv: true, scorm2004: true, h5pImport: true },
  },
];

const FALLBACK_ENTITLEMENTS: OrganizationEntitlementsDto = {
  organizationId: "demo-org",
  planCode: "business",
  planName: "Business",
  status: "ACTIVE",
  isActive: true,
  trialEndsAt: null,
  currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
  limits: {
    maxSeats: 75,
    maxWorkspaces: 30,
    maxMonthlyExports: 1500,
    storageQuotaBytes: "107374182400",
  },
  usage: {
    seatsUsed: 6,
    workspacesUsed: 2,
    monthlyExportsUsed: 18,
    storageBytesUsed: "1420000000",
  },
  features: { lti13: true, whiteLabel: true, analyticsCsv: true, scorm2004: true, h5pImport: true },
};

export class BillingApiService {
  static async listPlans(): Promise<ApiResponse<{ plans: SaaSPlanDto[] }>> {
    return ApiClient.get("/billing/plans", { plans: FALLBACK_PLANS });
  }

  static async getEntitlements(): Promise<ApiResponse<{ entitlements: OrganizationEntitlementsDto }>> {
    const orgId = ApiClient.getOrganizationId();
    if (!orgId) {
      return {
        success: true,
        data: { entitlements: FALLBACK_ENTITLEMENTS },
        timestamp: new Date().toISOString(),
      };
    }
    return ApiClient.get(`/organizations/${orgId}/billing/entitlements`, {
      entitlements: FALLBACK_ENTITLEMENTS,
    });
  }

  static async createCheckout(planCode: string, billingCycle: "MONTHLY" | "ANNUAL") {
    const orgId = ApiClient.getOrganizationId() || "demo-org";
    return ApiClient.post<{ sessionId: string; url: string }>(
      `/organizations/${orgId}/billing/checkout`,
      { planCode, billingCycle }
    );
  }

  static async openPortal() {
    const orgId = ApiClient.getOrganizationId() || "demo-org";
    return ApiClient.post<{ url: string }>(`/organizations/${orgId}/billing/portal`, {});
  }

  static async redeemLicense(code: string) {
    const orgId = ApiClient.getOrganizationId() || "demo-org";
    return ApiClient.post<{ subscription: any }>(
      `/organizations/${orgId}/billing/redeem-license`,
      { code }
    );
  }
}
