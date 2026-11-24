import { ApiClient, ApiResponse } from "./api-client.js";
import type { ContentProject } from "../types/content.types.js";
import { initialProjects } from "../mocks/content.mock.js";

export class ContentService {
  static async getProjects(organizationId?: string): Promise<ApiResponse<ContentProject[]>> {
    const endpoint = organizationId ? `/organizations/${organizationId}/projects` : "/projects";
    return ApiClient.get<ContentProject[]>(endpoint, initialProjects);
  }

  static async getProjectById(id: string, organizationId?: string): Promise<ApiResponse<ContentProject | undefined>> {
    const endpoint = organizationId ? `/organizations/${organizationId}/projects/${id}` : `/projects/${id}`;
    const found = initialProjects.find((p) => p.id === id);
    return ApiClient.get<ContentProject | undefined>(endpoint, found);
  }

  static async createProject(
    project: Partial<ContentProject> & { workspaceId?: string },
    organizationId?: string
  ): Promise<ApiResponse<ContentProject>> {
    const endpoint = organizationId ? `/organizations/${organizationId}/projects` : "/projects";
    const newProj: ContentProject = {
      id: `proj-${Date.now()}`,
      title: project.title || "Untitled Project",
      type: project.type || "Course Presentation",
      status: "Draft",
      date: "Just now",
      owner: "You",
      progress: 0,
      color: project.color || "safety",
      version: 1,
      description: project.description || "Newly created learning module",
    };
    return ApiClient.post<ContentProject>(endpoint, project, newProj);
  }

  static async duplicateProject(source: ContentProject, organizationId?: string): Promise<ApiResponse<ContentProject>> {
    const endpoint = organizationId
      ? `/organizations/${organizationId}/projects/${source.id}/duplicate`
      : `/projects/${source.id}/duplicate`;
    const clone: ContentProject = {
      ...source,
      id: `proj-${Date.now()}`,
      title: `${source.title} (Copy)`,
      status: "Draft",
      date: "Just now",
      owner: "You",
      progress: 0,
    };
    return ApiClient.post<ContentProject>(endpoint, {}, clone);
  }

  static async deleteProject(id: string, organizationId?: string): Promise<ApiResponse<boolean>> {
    const endpoint = organizationId ? `/organizations/${organizationId}/projects/${id}` : `/projects/${id}`;
    return ApiClient.delete<boolean>(endpoint, true);
  }

  static async getH5PContent(
    projectId: string,
    organizationId?: string
  ): Promise<ApiResponse<Record<string, unknown> | null>> {
    const endpoint = organizationId
      ? `/organizations/${organizationId}/projects/${projectId}/h5p`
      : `/projects/${projectId}/h5p`;
    return ApiClient.get<Record<string, unknown> | null>(endpoint, null);
  }

  static async saveH5PContent(
    projectId: string,
    data: Record<string, unknown>,
    organizationId?: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const endpoint = organizationId
      ? `/organizations/${organizationId}/projects/${projectId}/h5p`
      : `/projects/${projectId}/h5p`;
    return ApiClient.put<Record<string, unknown>>(endpoint, data, data);
  }

  static async importH5P(
    file: File,
    organizationId?: string,
    workspaceId?: string
  ): Promise<ApiResponse<{ filename: string; size: number }>> {
    const endpoint = organizationId ? `/organizations/${organizationId}/h5p/import` : "/h5p/import";
    return ApiClient.post<{ filename: string; size: number }>(
      endpoint,
      {
        filename: file.name,
        fileSizeBytes: file.size,
        workspaceId,
      },
      { filename: file.name, size: file.size }
    );
  }
}
