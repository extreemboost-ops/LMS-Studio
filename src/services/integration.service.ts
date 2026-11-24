import { ApiClient, ApiResponse } from "./api-client";
import type { LMSIntegration, SyncActivity } from "../types/integration.types";
import { initialLMSIntegrations, initialSyncActivities } from "../mocks/integration.mock";

export class IntegrationService {
  /**
   * Get all LMS integrations (supports org-scoped backend or global route with mock fallback)
   */
  static async getIntegrations(organizationId?: string): Promise<ApiResponse<LMSIntegration[]>> {
    const endpoint = organizationId
      ? `/organizations/${organizationId}/lms/connections`
      : "/integrations";
    return ApiClient.get<LMSIntegration[]>(endpoint, initialLMSIntegrations);
  }

  /**
   * Get sync activity history
   */
  static async getSyncHistory(organizationId?: string): Promise<ApiResponse<SyncActivity[]>> {
    const endpoint = organizationId
      ? `/organizations/${organizationId}/lms/activity-logs`
      : "/integrations/sync-history";
    return ApiClient.get<SyncActivity[]>(endpoint, initialSyncActivities);
  }

  /**
   * Test LMS connection
   */
  static async testConnection(
    connectionId: string,
    organizationId?: string
  ): Promise<ApiResponse<{ success: boolean; connectionStatus: string; healthStatus: string }>> {
    const endpoint = organizationId
      ? `/organizations/${organizationId}/lms/connections/${connectionId}/test`
      : `/integrations/${connectionId}/test`;

    const fallback = {
      success: true,
      connectionStatus: "Connected",
      healthStatus: "Healthy",
    };

    return ApiClient.post(endpoint, {}, fallback);
  }
}
