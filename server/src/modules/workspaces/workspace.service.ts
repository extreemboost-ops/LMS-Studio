import { randomUUID } from "node:crypto";
import { prisma } from "../../database/prisma.js";
import type { CreateWorkspaceInput } from "./workspace.schema.js";

export class WorkspaceService {
  static async listWorkspaces(organizationId: string) {
    return prisma.workspace.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            courses: true,
            contentProjects: true,
            mediaAssets: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  static async createWorkspace(organizationId: string, input: CreateWorkspaceInput) {
    const baseSlug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const slug = `${baseSlug}-${randomUUID().substring(0, 4)}`;

    return prisma.workspace.create({
      data: {
        organizationId,
        name: input.name,
        slug,
        description: input.description,
      },
    });
  }
}
