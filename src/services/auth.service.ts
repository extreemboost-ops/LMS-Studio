import { ApiClient, type ApiResponse } from "./api-client";

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  isEmailVerified: boolean;
  role?: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role?: string;
}

export interface AuthSessionResponse {
  user: UserSummary;
  organization: OrganizationSummary | null;
  workspaceId?: string;
  accessToken: string;
}

export class FrontendAuthService {
  static async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    organizationName?: string;
  }): Promise<ApiResponse<AuthSessionResponse>> {
    const res = await ApiClient.post<AuthSessionResponse>("/auth/register", data);
    if (res.data?.accessToken) {
      ApiClient.setToken(res.data.accessToken);
    }
    if (res.data?.organization?.id) {
      ApiClient.setOrganizationId(res.data.organization.id);
    }
    return res;
  }

  static async login(data: {
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthSessionResponse>> {
    const res = await ApiClient.post<AuthSessionResponse>("/auth/login", data);
    if (res.data?.accessToken) {
      ApiClient.setToken(res.data.accessToken);
    }
    if (res.data?.organization?.id) {
      ApiClient.setOrganizationId(res.data.organization.id);
    }
    return res;
  }

  static async refresh(): Promise<ApiResponse<{ accessToken: string }>> {
    const res = await ApiClient.post<{ accessToken: string }>("/auth/refresh", {});
    if (res.data?.accessToken) {
      ApiClient.setToken(res.data.accessToken);
    }
    return res;
  }

  static async logout(): Promise<void> {
    try {
      await ApiClient.post("/auth/logout", {});
    } finally {
      ApiClient.setToken(null);
      ApiClient.setOrganizationId(null);
    }
  }

  static async getMe(): Promise<ApiResponse<UserSummary>> {
    return ApiClient.get<UserSummary>("/users/me");
  }

  static async getUserOrganizations(): Promise<ApiResponse<OrganizationSummary[]>> {
    return ApiClient.get<OrganizationSummary[]>("/organizations");
  }

  static async switchOrganization(organizationId: string): Promise<ApiResponse<AuthSessionResponse>> {
    const res = await ApiClient.post<AuthSessionResponse>(`/organizations/${organizationId}/switch`, {});
    if (res.data?.accessToken) {
      ApiClient.setToken(res.data.accessToken);
    }
    ApiClient.setOrganizationId(organizationId);
    return res;
  }
}
