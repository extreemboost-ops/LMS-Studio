import { ApiClient, ApiResponse } from "./api-client";
import type { MediaAsset, StorageMetrics } from "../types/media.types";
import { initialMediaAssets } from "../mocks/media.mock";
import { storageMetricsMock } from "../mocks/dashboard.mock";

export class MediaService {
  static async getMediaAssets(): Promise<ApiResponse<MediaAsset[]>> {
    return ApiClient.get<MediaAsset[]>("/media", initialMediaAssets);
  }

  static async getStorageMetrics(): Promise<ApiResponse<StorageMetrics>> {
    return ApiClient.get<StorageMetrics>("/media/storage", storageMetricsMock);
  }

  static async uploadMedia(file: File): Promise<ApiResponse<MediaAsset>> {
    const newAsset: MediaAsset = {
      id: `m-${Date.now()}`,
      name: file.name,
      type: file.type.includes("video") ? "video" : file.type.includes("image") ? "image" : file.type.includes("audio") ? "audio" : "document",
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadedAt: "Just now",
    };
    return ApiClient.post<MediaAsset>("/media/upload", { filename: file.name }, newAsset);
  }
}
