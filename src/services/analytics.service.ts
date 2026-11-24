import { ApiClient, ApiResponse } from "./api-client";
import { analyticsKpis, formatCompletionData, topPerformingContent } from "../mocks/analytics.mock";
import type { StatMetric, FormatCompletion, TopPerformingContent } from "../types/analytics.types";

export interface DashboardMetrics {
  kpis: StatMetric[];
  chartData: {
    interval: "Weekly" | "Monthly";
    points: Array<{ label: string; value: number }>;
  };
  formatCompletion: FormatCompletion[];
  topContent: TopPerformingContent[];
}

export class AnalyticsService {
  static async getAnalyticsKpis(): Promise<ApiResponse<StatMetric[]>> {
    return ApiClient.get<StatMetric[]>("/analytics/kpis", analyticsKpis);
  }

  static async getFormatCompletion(): Promise<ApiResponse<FormatCompletion[]>> {
    return ApiClient.get<FormatCompletion[]>("/analytics/formats", formatCompletionData);
  }

  static async getTopPerformingContent(): Promise<ApiResponse<TopPerformingContent[]>> {
    return ApiClient.get<TopPerformingContent[]>("/analytics/top-content", topPerformingContent);
  }

  static async getDashboardMetrics(interval: "Weekly" | "Monthly" = "Weekly"): Promise<ApiResponse<DashboardMetrics>> {
    const fallback: DashboardMetrics = {
      kpis: analyticsKpis,
      chartData: {
        interval,
        points:
          interval === "Weekly"
            ? [
                { label: "Apr 1", value: 1200 },
                { label: "Apr 8", value: 1850 },
                { label: "Apr 15", value: 2400 },
                { label: "Apr 22", value: 2900 },
                { label: "Apr 28", value: 3200 },
              ]
            : [
                { label: "Jan", value: 6800 },
                { label: "Feb", value: 8400 },
                { label: "Mar", value: 10200 },
                { label: "Apr", value: 12480 },
              ],
      },
      formatCompletion: formatCompletionData,
      topContent: topPerformingContent,
    };

    return ApiClient.get<DashboardMetrics>(`/analytics/dashboard?interval=${interval}`, fallback);
  }

  static async exportCsvReport(): Promise<void> {
    try {
      window.open(`${ApiClient.getBaseUrl()}/analytics/export/csv`, "_blank");
    } catch {
      // Fallback
    }
  }

  static async getAuditLogs(): Promise<ApiResponse<any>> {
    return ApiClient.get("/analytics/audit-logs", { logs: [], total: 0 });
  }

  static async getLmsSyncLogs(): Promise<ApiResponse<any>> {
    return ApiClient.get("/analytics/lms-sync-logs", []);
  }

  static async getTelemetry(): Promise<ApiResponse<any>> {
    return ApiClient.get("/analytics/telemetry", {
      storage: { totalBytesUsed: "524288000", quotaBytes: "10737418240", quotaUtilizationPercent: 4.88 },
      exportQueue: { completedCount: 45, failedCount: 1, successRatePercent: 97.8 },
      lmsSync: { totalSyncEvents: 120, errorRatePercent: 1.6 },
    });
  }
}
