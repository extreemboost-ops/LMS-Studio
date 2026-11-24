import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  SaveDocumentInput,
  CreateElementInput,
  UpdateElementInput,
  ReorderElementsInput,
  CreateVersionSnapshotInput,
} from "./content.schema.js";

export class ContentService {
  /**
   * Lists all content projects within an organization, optionally filtered
   */
  static async listProjects(
    organizationId: string,
    workspaceId?: string,
    status?: string,
    contentType?: string,
    search?: string
  ) {
    const whereClause: Record<string, unknown> = { organizationId };

    if (workspaceId) {
      whereClause.workspaceId = workspaceId;
    }
    if (status) {
      whereClause.status = status;
    }
    if (contentType) {
      whereClause.contentType = contentType;
    }
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const projects = await prisma.contentProject.findMany({
      where: whereClause,
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: {
            elements: true,
            versions: true,
            lessons: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return projects.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      contentType: p.contentType,
      status: p.status,
      thumbnailUrl: p.thumbnailUrl,
      themeVariant: p.themeVariant,
      currentVersionNumber: p.currentVersionNumber,
      workspace: p.workspace,
      createdBy: p.createdBy,
      elementsCount: p._count.elements,
      versionsCount: p._count.versions,
      lessonsCount: p._count.lessons,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  /**
   * Retrieves full project details with document settings and element tree
   */
  static async getProjectById(projectId: string, organizationId: string) {
    const project = await prisma.contentProject.findFirst({
      where: { id: projectId, organizationId },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        documents: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
        elements: {
          orderBy: [{ parentId: "asc" }, { orderIndex: "asc" }],
        },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 5,
          select: {
            id: true,
            versionNumber: true,
            title: true,
            description: true,
            createdAt: true,
            createdBy: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw AppError.notFound("ContentProject");
    }

    return {
      ...project,
      currentDocument: project.documents[0] || null,
    };
  }

  /**
   * Creates an interactive content project with initial document and root element
   */
  static async createProject(organizationId: string, userId: string, input: CreateProjectInput) {
    // 1. Verify workspace belongs to organization
    const workspace = await prisma.workspace.findFirst({
      where: { id: input.workspaceId, organizationId },
    });

    if (!workspace) {
      throw AppError.notFound("Workspace");
    }

    // 2. Atomic creation of project, initial document, and starter element
    return prisma.$transaction(async (tx) => {
      const project = await tx.contentProject.create({
        data: {
          organizationId,
          workspaceId: input.workspaceId,
          createdById: userId,
          title: input.title,
          description: input.description,
          contentType: input.contentType,
          themeVariant: input.themeVariant,
          thumbnailUrl: input.thumbnailUrl,
          status: "DRAFT",
          currentVersionNumber: 1,
        },
      });

      const document = await tx.contentDocument.create({
        data: {
          contentProjectId: project.id,
          versionNumber: 1,
          isPublished: false,
          metadata: {
            generator: "SCORM & H5P Authoring Studio",
            contentType: input.contentType,
          },
          settings: {
            enableAudio: true,
            theme: input.themeVariant,
          },
        },
      });

      // Starter slide or chapter element
      const starterElement = await tx.contentElement.create({
        data: {
          contentProjectId: project.id,
          documentId: document.id,
          elementType: "SLIDE",
          name: "Slide 1",
          orderIndex: 0,
          config: {
            title: "Welcome to " + input.title,
            elements: [],
          },
        },
      });

      // Initial revision record
      await tx.contentRevision.create({
        data: {
          contentProjectId: project.id,
          authorId: userId,
          revisionNumber: 1,
          changeSummary: "Project initialized with default slide",
          diffPayload: { action: "INITIAL_CREATE", initialElementId: starterElement.id },
        },
      });

      return {
        ...project,
        document,
        starterElement,
      };
    });
  }

  /**
   * Updates project metadata
   */
  static async updateProject(projectId: string, organizationId: string, input: UpdateProjectInput) {
    const existing = await prisma.contentProject.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!existing) {
      throw AppError.notFound("ContentProject");
    }

    const updated = await prisma.contentProject.update({
      where: { id: projectId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.themeVariant !== undefined ? { themeVariant: input.themeVariant } : {}),
        ...(input.thumbnailUrl !== undefined ? { thumbnailUrl: input.thumbnailUrl } : {}),
      },
    });

    return updated;
  }

  /**
   * Duplicates an existing project, its document settings, and its element tree
   */
  static async duplicateProject(projectId: string, organizationId: string, userId: string) {
    const source = await prisma.contentProject.findFirst({
      where: { id: projectId, organizationId },
      include: {
        documents: {
          where: { versionNumber: 1 },
          take: 1,
        },
        elements: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!source) {
      throw AppError.notFound("ContentProject");
    }

    return prisma.$transaction(async (tx) => {
      // 1. Create cloned project
      const clonedProject = await tx.contentProject.create({
        data: {
          organizationId: source.organizationId,
          workspaceId: source.workspaceId,
          createdById: userId,
          title: `${source.title} (Copy)`,
          description: source.description,
          contentType: source.contentType,
          themeVariant: source.themeVariant,
          thumbnailUrl: source.thumbnailUrl,
          status: "DRAFT",
          currentVersionNumber: 1,
        },
      });

      // 2. Clone document
      const sourceDoc = source.documents[0];
      const clonedDoc = await tx.contentDocument.create({
        data: {
          contentProjectId: clonedProject.id,
          versionNumber: 1,
          isPublished: false,
          metadata: (sourceDoc?.metadata as Prisma.InputJsonValue) || {},
          settings: (sourceDoc?.settings as Prisma.InputJsonValue) || {},
        },
      });

      // 3. Remap elements hierarchy
      const idMap = new Map<string, string>();
      for (const el of source.elements) {
        const newId = randomUUID();
        idMap.set(el.id, newId);
      }

      for (const el of source.elements) {
        const newParentId = el.parentId ? idMap.get(el.parentId) || null : null;
        await tx.contentElement.create({
          data: {
            id: idMap.get(el.id)!,
            contentProjectId: clonedProject.id,
            documentId: clonedDoc.id,
            parentId: newParentId,
            elementType: el.elementType,
            name: el.name,
            orderIndex: el.orderIndex,
            config: (el.config as Prisma.InputJsonValue) || {},
          },
        });
      }

      return clonedProject;
    });
  }

  /**
   * Deletes a content project
   */
  static async deleteProject(projectId: string, organizationId: string) {
    const existing = await prisma.contentProject.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!existing) {
      throw AppError.notFound("ContentProject");
    }

    await prisma.contentProject.delete({
      where: { id: projectId },
    });

    return { id: projectId, deleted: true };
  }

  /**
   * Saves document settings and metadata
   */
  static async saveDocument(projectId: string, organizationId: string, input: SaveDocumentInput) {
    const project = await prisma.contentProject.findFirst({
      where: { id: projectId, organizationId },
      include: {
        documents: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!project) {
      throw AppError.notFound("ContentProject");
    }

    const currentDoc = project.documents[0];
    if (currentDoc) {
      const updated = await prisma.contentDocument.update({
        where: { id: currentDoc.id },
        data: {
          metadata: input.metadata as Prisma.InputJsonValue,
          settings: input.settings as Prisma.InputJsonValue,
          ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
        },
      });
      return updated;
    }

    // Create if missing
    const created = await prisma.contentDocument.create({
      data: {
        contentProjectId: projectId,
        versionNumber: project.currentVersionNumber,
        metadata: input.metadata as Prisma.InputJsonValue,
        settings: input.settings as Prisma.InputJsonValue,
        isPublished: input.isPublished ?? false,
      },
    });

    return created;
  }

  /**
   * Element Management: Creates a new element in the project hierarchy
   */
  static async createElement(projectId: string, organizationId: string, input: CreateElementInput) {
    const project = await prisma.contentProject.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw AppError.notFound("ContentProject");
    }

    if (input.parentId) {
      const parent = await prisma.contentElement.findFirst({
        where: { id: input.parentId, contentProjectId: projectId },
      });
      if (!parent) {
        throw AppError.notFound("ParentElement");
      }
    }

    const element = await prisma.contentElement.create({
      data: {
        contentProjectId: projectId,
        documentId: input.documentId,
        parentId: input.parentId,
        elementType: input.elementType,
        name: input.name,
        orderIndex: input.orderIndex,
        config: input.config as Prisma.InputJsonValue,
      },
    });

    return element;
  }

  /**
   * Updates an existing element
   */
  static async updateElement(
    elementId: string,
    projectId: string,
    organizationId: string,
    input: UpdateElementInput
  ) {
    const element = await prisma.contentElement.findFirst({
      where: {
        id: elementId,
        contentProjectId: projectId,
        project: { organizationId },
      },
    });

    if (!element) {
      throw AppError.notFound("ContentElement");
    }

    if (input.parentId) {
      const parent = await prisma.contentElement.findFirst({
        where: { id: input.parentId, contentProjectId: projectId },
      });
      if (!parent) {
        throw AppError.notFound("ParentElement");
      }
    }

    const updated = await prisma.contentElement.update({
      where: { id: elementId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(input.config !== undefined ? { config: input.config as Prisma.InputJsonValue } : {}),
      },
    });

    return updated;
  }

  /**
   * Deletes an element
   */
  static async deleteElement(elementId: string, projectId: string, organizationId: string) {
    const element = await prisma.contentElement.findFirst({
      where: {
        id: elementId,
        contentProjectId: projectId,
        project: { organizationId },
      },
    });

    if (!element) {
      throw AppError.notFound("ContentElement");
    }

    await prisma.contentElement.delete({
      where: { id: elementId },
    });

    return { id: elementId, deleted: true };
  }

  /**
   * Reorders multiple elements in a project
   */
  static async reorderElements(
    projectId: string,
    organizationId: string,
    input: ReorderElementsInput
  ) {
    const project = await prisma.contentProject.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw AppError.notFound("ContentProject");
    }

    return prisma.$transaction(async (tx) => {
      for (const item of input.elements) {
        await tx.contentElement.updateMany({
          where: { id: item.id, contentProjectId: projectId },
          data: {
            orderIndex: item.orderIndex,
            ...(item.parentId !== undefined ? { parentId: item.parentId } : {}),
          },
        });
      }
      return { success: true, count: input.elements.length };
    });
  }

  /**
   * Creates an immutable published version snapshot
   */
  static async createVersionSnapshot(
    projectId: string,
    organizationId: string,
    userId: string,
    input: CreateVersionSnapshotInput
  ) {
    const project = await prisma.contentProject.findFirst({
      where: { id: projectId, organizationId },
      include: {
        documents: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
        elements: {
          orderBy: [{ parentId: "asc" }, { orderIndex: "asc" }],
        },
      },
    });

    if (!project) {
      throw AppError.notFound("ContentProject");
    }

    const nextVersionNumber = project.currentVersionNumber + 1;

    // Serialize snapshot payload
    const snapshotPayload = {
      projectTitle: project.title,
      contentType: project.contentType,
      themeVariant: project.themeVariant,
      document: project.documents[0] || null,
      elements: project.elements,
      publishedAt: new Date().toISOString(),
    };

    return prisma.$transaction(async (tx) => {
      // 1. Create immutable snapshot record
      const version = await tx.contentVersion.create({
        data: {
          contentProjectId: projectId,
          versionNumber: nextVersionNumber,
          title: input.title,
          description: input.description,
          h5pLibraryId: input.h5pLibraryId,
          snapshotPayload: snapshotPayload as Prisma.InputJsonValue,
          createdById: userId,
        },
      });

      // 2. Increment project version number and set status to PUBLISHED
      await tx.contentProject.update({
        where: { id: projectId },
        data: {
          currentVersionNumber: nextVersionNumber,
          status: "PUBLISHED",
        },
      });

      return version;
    });
  }

  /**
   * Lists historical published versions
   */
  static async listVersions(projectId: string, organizationId: string) {
    const project = await prisma.contentProject.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw AppError.notFound("ContentProject");
    }

    const versions = await prisma.contentVersion.findMany({
      where: { contentProjectId: projectId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { versionNumber: "desc" },
    });

    return versions;
  }
}
