import { ApiClient, type ApiResponse } from "./api-client";

export interface DistributorDashboardDto {
  distributor: {
    id: string;
    name: string;
    slug: string;
    status: string;
    billingMode: string;
    commissionPercent: number;
    seatPoolTotal: number;
    seatPoolUsed: number;
    customDomain: string | null;
  };
  kpis: {
    totalClients: number;
    activeClients: number;
    unusedLicenses: number;
    totalEarnedCents: number;
    availableBalanceCents: number;
  };
}

export interface DistributorClientDto {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  subscriptionStatus: string;
  seatCount: number;
  membersCount: number;
  workspacesCount: number;
  packagesCount: number;
  createdAt: string;
}

export interface PartnerBrandingDto {
  branding: {
    appName: string;
    appSubtitle: string;
    primaryColor: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    supportEmail: string;
    hidePoweredBy: boolean;
    customDomain: string | null;
  };
  dnsInstructions: {
    cnameTarget: string;
    txtHost: string | null;
    txtValue: string;
  };
}

const FALLBACK_DASHBOARD: DistributorDashboardDto = {
  distributor: {
    id: "dist-demo-01",
    name: "Apex EdTech Partners",
    slug: "apex-edtech",
    status: "ACTIVE",
    billingMode: "REV_SHARE",
    commissionPercent: 25,
    seatPoolTotal: 500,
    seatPoolUsed: 140,
    customDomain: "studio.apexedtech.io",
  },
  kpis: {
    totalClients: 14,
    activeClients: 13,
    unusedLicenses: 8,
    totalEarnedCents: 487500,
    availableBalanceCents: 142500,
  },
};

const FALLBACK_CLIENTS: DistributorClientDto[] = [
  {
    id: "cli-01",
    name: "Lincoln University L&D",
    slug: "lincoln-univ",
    plan: "enterprise",
    isActive: true,
    subscriptionStatus: "ACTIVE",
    seatCount: 80,
    membersCount: 42,
    workspacesCount: 6,
    packagesCount: 31,
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
  },
  {
    id: "cli-02",
    name: "MedSafe Compliance Group",
    slug: "medsafe-group",
    plan: "pro",
    isActive: true,
    subscriptionStatus: "ACTIVE",
    seatCount: 25,
    membersCount: 18,
    workspacesCount: 3,
    packagesCount: 14,
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
  },
  {
    id: "cli-03",
    name: "Nordic Retail Academy",
    slug: "nordic-retail",
    plan: "starter",
    isActive: false,
    subscriptionStatus: "SUSPENDED",
    seatCount: 5,
    membersCount: 4,
    workspacesCount: 1,
    packagesCount: 3,
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
];

const FALLBACK_BRANDING: PartnerBrandingDto = {
  branding: {
    appName: "Apex Learning Studio",
    appSubtitle: "PARTNER EDITION",
    primaryColor: "#0f766e",
    logoUrl: null,
    faviconUrl: null,
    supportEmail: "support@apexedtech.io",
    hidePoweredBy: true,
    customDomain: "studio.apexedtech.io",
  },
  dnsInstructions: {
    cnameTarget: "cname.lms-studio.app",
    txtHost: "_lms-verify.studio.apexedtech.io",
    txtValue: "lms-verify=dist-demo-01",
  },
};

export class DistributorApiService {
  static async getDashboard(): Promise<ApiResponse<DistributorDashboardDto>> {
    return ApiClient.get("/distributor/dashboard", FALLBACK_DASHBOARD);
  }

  static async listClients(): Promise<ApiResponse<{ clients: DistributorClientDto[] }>> {
    return ApiClient.get("/distributor/clients", { clients: FALLBACK_CLIENTS });
  }

  static async provisionClient(input: {
    organizationName: string;
    ownerEmail: string;
    ownerFirstName: string;
    ownerLastName: string;
    planCode: "starter" | "pro" | "business" | "enterprise";
    seatCount: number;
  }) {
    return ApiClient.post<any>("/distributor/clients", input);
  }

  static async setClientStatus(clientOrgId: string, isActive: boolean) {
    return ApiClient.patch<any>(`/distributor/clients/${clientOrgId}/status`, { isActive });
  }

  static async generatePartnerLicenses(input: {
    planCode: "starter" | "pro" | "business" | "enterprise";
    count: number;
    seatCount: number;
    durationDays: number;
    notes?: string;
  }) {
    return ApiClient.post<{ keys: Array<{ id: string; code: string; planCode: string; seatCount: number }> }>(
      "/distributor/licenses/generate",
      input
    );
  }

  static async listCommissions(): Promise<ApiResponse<{ commissions: any[]; payouts: any[] }>> {
    return ApiClient.get("/distributor/commissions", {
      commissions: [
        {
          id: "com-01",
          grossAmountCents: 19900,
          commissionPercent: "25.00",
          commissionCents: 4975,
          status: "AVAILABLE",
          description: "Business (MONTHLY) subscription commission",
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          id: "com-02",
          grossAmountCents: 79000,
          commissionPercent: "25.00",
          commissionCents: 19750,
          status: "AVAILABLE",
          description: "Pro Studio (ANNUAL) subscription commission",
          createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        },
      ],
      payouts: [
        {
          id: "pay-01",
          amountCents: 120000,
          status: "PAID",
          referenceNote: "Stripe Connect Transfer #TX-9941",
          createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        },
      ],
    });
  }

  static async requestPayout(amountCents: number, referenceNote?: string) {
    return ApiClient.post<any>("/distributor/payouts", { amountCents, referenceNote });
  }

  static async getBranding(): Promise<ApiResponse<PartnerBrandingDto>> {
    return ApiClient.get("/distributor/branding", FALLBACK_BRANDING);
  }

  static async updateBranding(input: Record<string, unknown>) {
    return ApiClient.patch<any>("/distributor/branding", input);
  }

  static async verifyCustomDomain() {
    return ApiClient.post<{ verification: { domain: string; cnameVerified: boolean; txtVerified: boolean } }>(
      "/distributor/branding/verify-domain",
      {}
    );
  }

  // Super Admin Command Center APIs
  static async getAdminOverview(): Promise<ApiResponse<any>> {
    return ApiClient.get("/admin/distributors/overview", {
      metrics: {
        totalOrganizations: 48,
        activeSubscriptions: 36,
        trialingSubscriptions: 12,
        totalDistributors: 6,
        pendingApplications: 2,
        estimatedMrrCents: 642000,
        pendingPayoutsCents: 142500,
      },
      distributors: [
        {
          id: "dist-demo-01",
          name: "Apex EdTech Partners",
          slug: "apex-edtech",
          status: "ACTIVE",
          billingMode: "REV_SHARE",
          commissionPercent: "25.00",
          contactEmail: "partners@apexedtech.io",
          _count: { organizations: 14, licenseKeys: 22 },
        },
        {
          id: "dist-demo-02",
          name: "Global LMS Resellers Ltd",
          slug: "global-lms",
          status: "PENDING",
          billingMode: "WHOLESALE_POOL",
          commissionPercent: "20.00",
          contactEmail: "licensing@globallms.co.uk",
          _count: { organizations: 0, licenseKeys: 0 },
        },
      ],
      payoutRequests: [
        {
          id: "pay-req-01",
          amountCents: 142500,
          status: "REQUESTED",
          referenceNote: "November Partner Settlement",
          distributor: { name: "Apex EdTech Partners", slug: "apex-edtech" },
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
      recentOrganizations: FALLBACK_CLIENTS.map((c) => ({
        ...c,
        distributorName: "Apex EdTech Partners",
      })),
    });
  }

  static async reviewDistributor(
    distributorId: string,
    payload: { status: "ACTIVE" | "SUSPENDED" | "REJECTED"; commissionPercent?: number; seatPoolTotal?: number }
  ) {
    return ApiClient.patch<any>(`/admin/distributors/${distributorId}/review`, payload);
  }

  static async processPayout(payoutId: string, status: "APPROVED" | "PAID" | "REJECTED") {
    return ApiClient.patch<any>(`/admin/distributors/payouts/${payoutId}`, { status });
  }

  static async adminGenerateLicenses(input: {
    planCode: "starter" | "pro" | "business" | "enterprise";
    count: number;
    seatCount: number;
    durationDays: number;
  }) {
    return ApiClient.post<{ keys: Array<{ id: string; code: string; planCode: string }> }>(
      "/billing/licenses/generate",
      input
    );
  }
}
