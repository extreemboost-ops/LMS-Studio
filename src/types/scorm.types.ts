export type ExportFormat = "Native H5P" | "SCORM 1.2" | "SCORM 2004";

export interface ExportConfig {
  format: ExportFormat;
  packageName: string;
  version: string;
  description: string;
  launchBehavior: string;
  completionCriteria: string;
  passingScore: number;
  trackingMode: string;
}

export interface ExportJob {
  id: string;
  packageName: string;
  format: ExportFormat;
  status: "pending" | "packaging" | "ready" | "failed";
  progress: number;
  createdAt: string;
  fileSize?: string;
  downloadUrl?: string;
}
