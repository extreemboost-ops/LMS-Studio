export type MediaType = "all" | "image" | "video" | "audio" | "document";

export interface MediaAsset {
  id: string;
  name: string;
  type: "image" | "video" | "audio" | "document";
  size: string;
  duration?: string;
  uploadedAt: string;
  url?: string;
}

export interface StorageMetrics {
  usedGB: number;
  totalGB: number;
  percentUsed: number;
  uploadedFilesCount: number;
  breakdown: {
    videoGB: number;
    imageGB: number;
    otherGB: number;
  };
}
