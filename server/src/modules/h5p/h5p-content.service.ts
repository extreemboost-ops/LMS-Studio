import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";
import { H5PSemanticsValidator, type H5PSemanticsField } from "./h5p-semantics.js";
import { H5PLibraryService } from "./h5p-library.service.js";
import type { Prisma } from "@prisma/client";
import type { SaveH5PContentInput } from "./h5p.schema.js";

export class H5PContentService {
  /**
   * Retrieves the H5P content instance for a project along with resolved player assets
   */
  static async getContentInstance(projectId: string, organizationId: string) {
    const project = await prisma.contentProject.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw AppError.notFound("ContentProject");
    }

    const h5pContent = await prisma.h5PContent.findUnique({
      where: { contentProjectId: projectId },
      include: {
        mainLibrary: true,
      },
    });

    if (!h5pContent) {
      return null;
    }

    // Resolve required client assets for player
    const assetBundle = await H5PLibraryService.resolveAssetHierarchy(h5pContent.libraryId);

    return {
      id: h5pContent.id,
      contentProjectId: h5pContent.contentProjectId,
      library: {
        id: h5pContent.mainLibrary.id,
        machineName: h5pContent.mainLibrary.machineName,
        title: h5pContent.mainLibrary.title,
        version: `${h5pContent.mainLibrary.majorVersion}.${h5pContent.mainLibrary.minorVersion}.${h5pContent.mainLibrary.patchVersion}`,
        runnable: h5pContent.mainLibrary.runnable,
        fullscreen: h5pContent.mainLibrary.fullscreen,
      },
      parameters: h5pContent.parameters,
      filteredParameters: h5pContent.filteredParameters || h5pContent.parameters,
      metadata: h5pContent.metadata,
      embedType: h5pContent.embedType,
      assets: {
        styles: assetBundle.styles,
        scripts: assetBundle.scripts,
        dependencies: assetBundle.libraries,
      },
      updatedAt: h5pContent.updatedAt,
    };
  }

  /**
   * Saves or updates H5P content parameters for a project
   */
  static async saveContentInstance(
    projectId: string,
    organizationId: string,
    input: SaveH5PContentInput
  ) {
    // 1. Verify project exists within organization
    const project = await prisma.contentProject.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw AppError.notFound("ContentProject");
    }

    // 2. Verify library exists
    const library = await prisma.h5PLibrary.findUnique({
      where: { id: input.libraryId },
    });

    if (!library) {
      throw AppError.notFound("H5PLibrary");
    }

    // 3. Validate parameters against library semantics
    const semantics = (library.semantics as unknown as H5PSemanticsField[]) || undefined;
    const validation = H5PSemanticsValidator.validate(semantics, input.parameters);

    if (!validation.isValid) {
      throw AppError.unprocessable("H5P parameters failed semantics validation", validation.errors);
    }

    // 4. Atomic persistence of H5P content & library bindings
    return prisma.$transaction(async (tx) => {
      const h5pContent = await tx.h5PContent.upsert({
        where: { contentProjectId: projectId },
        update: {
          libraryId: input.libraryId,
          parameters: input.parameters as Prisma.InputJsonValue,
          filteredParameters: validation.filteredParameters as Prisma.InputJsonValue,
          metadata: input.metadata as Prisma.InputJsonValue,
          embedType: input.embedType,
        },
        create: {
          contentProjectId: projectId,
          libraryId: input.libraryId,
          parameters: input.parameters as Prisma.InputJsonValue,
          filteredParameters: validation.filteredParameters as Prisma.InputJsonValue,
          metadata: input.metadata as Prisma.InputJsonValue,
          embedType: input.embedType,
        },
        include: {
          mainLibrary: true,
        },
      });

      // Bind main library into content libraries
      await tx.h5PContentLibrary.upsert({
        where: {
          h5pContentId_libraryId: {
            h5pContentId: h5pContent.id,
            libraryId: input.libraryId,
          },
        },
        update: {},
        create: {
          h5pContentId: h5pContent.id,
          libraryId: input.libraryId,
          dependencyType: "PRELOADED",
        },
      });

      return h5pContent;
    });
  }

  /**
   * Validates parameters against a library without saving
   */
  static async validateParameters(libraryId: string, parameters: Record<string, unknown>) {
    const library = await prisma.h5PLibrary.findUnique({
      where: { id: libraryId },
    });

    if (!library) {
      throw AppError.notFound("H5PLibrary");
    }

    const semantics = (library.semantics as unknown as H5PSemanticsField[]) || undefined;
    return H5PSemanticsValidator.validate(semantics, parameters);
  }
}
