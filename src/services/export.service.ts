import { ApiClient, ApiResponse } from "./api-client";
import type { ExportConfig, ExportJob } from "../types/scorm.types";

export interface SCORMPackageDto {
  id: string;
  organizationId: string;
  workspaceId: string;
  contentProjectId: string;
  contentVersionId: string;
  format: "SCORM_12" | "SCORM_2004_3RD_EDITION" | "SCORM_2004_4TH_EDITION";
  packageTitle: string;
  versionString: string;
  manifestIdentifier: string;
  storageKey: string;
  fileSizeBytes: string;
  checksumSha256: string;
  launchFile: string;
  createdAt: string;
  runtimeConfig?: Record<string, unknown>;
}

export class ExportService {
  /**
   * Generic export job initiation (matches frontend modal)
   */
  static async startExportJob(config: ExportConfig): Promise<ApiResponse<ExportJob>> {
    const job: ExportJob = {
      id: `job-${Date.now()}`,
      packageName: `${config.packageName}.${config.format === "Native H5P" ? "h5p" : "zip"}`,
      format: config.format,
      status: "ready",
      progress: 100,
      createdAt: "Just now",
      fileSize: "24.8 MB",
    };
    return ApiClient.post<ExportJob>("/export/jobs", config, job);
  }

  /**
   * Export content project to SCORM via organization endpoint
   */
  static async exportSCORMProject(
    organizationId: string,
    projectId: string,
    config: ExportConfig
  ): Promise<ApiResponse<ExportJob>> {
    const standard =
      config.format === "SCORM 1.2"
        ? "SCORM_12"
        : config.format === "SCORM 2004"
        ? "SCORM_2004_4TH_EDITION"
        : "SCORM_2004_4TH_EDITION";

    const payload = {
      format: standard,
      packageTitle: config.packageName,
      versionString: config.version,
      launchBehavior: config.launchBehavior === "New Window" ? "NEW_WINDOW" : "LMS_FRAME",
      completionCriteria: "BOTH",
      passingScorePercent: config.passingScore || 80,
      trackingMode: "SCORE_AND_STATUS",
      masteryScoreDecimal: (config.passingScore || 80) / 100,
    };

    const fallback: ExportJob = {
      id: `job-${Date.now()}`,
      packageName: `${config.packageName}.zip`,
      format: config.format,
      status: "ready",
      progress: 100,
      createdAt: "Just now",
      fileSize: "18.4 MB",
    };

    return ApiClient.post<ExportJob>(
      `/organizations/${organizationId}/projects/${projectId}/scorm/export`,
      payload,
      fallback
    );
  }

  /**
   * List packages for organization
   */
  static async getSCORMPackages(
    organizationId: string,
    projectId?: string
  ): Promise<ApiResponse<SCORMPackageDto[]>> {
    const endpoint = projectId
      ? `/organizations/${organizationId}/scorm/packages?projectId=${projectId}`
      : `/organizations/${organizationId}/scorm/packages`;

    return ApiClient.get<SCORMPackageDto[]>(endpoint, []);
  }

  /**
   * Get single package by ID
   */
  static async getSCORMPackageById(
    organizationId: string,
    packageId: string
  ): Promise<ApiResponse<SCORMPackageDto | null>> {
    return ApiClient.get<SCORMPackageDto | null>(
      `/organizations/${organizationId}/scorm/packages/${packageId}`,
      null
    );
  }
}
