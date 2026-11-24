import { ApiClient, ApiResponse } from "./api-client";
import type { ContentProject, ProjectStatus } from "../types/content.types";
import type { Slide, SlideElement } from "../types/editor.types";

export interface ProjectSavePayload {
  title?: string;
  description?: string;
  status?: ProjectStatus;
  slides?: Slide[];
  elements?: SlideElement[];
}

export class EditorSyncService {
  /**
   * Sync active project changes to backend API with fallback
   */
  static async saveProject(
    projectId: string,
    payload: ProjectSavePayload,
    organizationId?: string
  ): Promise<ApiResponse<ContentProject>> {
    const endpoint = organizationId
      ? `/organizations/${organizationId}/projects/${projectId}`
      : `/projects/${projectId}`;

    const fallback: ContentProject = {
      id: projectId,
      title: payload.title || "Safety Course",
      type: "Interactive Video",
      status: payload.status || "Draft",
      date: "Just now",
      owner: "You",
      progress: 50,
      color: "safety",
      version: 1,
    };

    return ApiClient.put<ContentProject>(endpoint, payload, fallback);
  }

  /**
   * Save slide element update
   */
  static async saveElement(
    projectId: string,
    element: SlideElement,
    organizationId?: string
  ): Promise<ApiResponse<SlideElement>> {
    const endpoint = organizationId
      ? `/organizations/${organizationId}/projects/${projectId}/elements/${element.id}`
      : `/projects/${projectId}/elements/${element.id}`;

    return ApiClient.put<SlideElement>(endpoint, element, element);
  }
}
