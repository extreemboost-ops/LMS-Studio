import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";
import type { Prisma } from "@prisma/client";
import type { RegisterLibraryInput } from "./h5p.schema.js";

export interface ResolvedAssets {
  styles: string[];
  scripts: string[];
  libraries: Array<{
    id: string;
    machineName: string;
    majorVersion: number;
    minorVersion: number;
    patchVersion: number;
  }>;
}

export class H5PLibraryService {
  /**
   * Installs or updates a library in the global registry
   */
  static async registerLibrary(input: RegisterLibraryInput) {
    const existing = await prisma.h5PLibrary.findUnique({
      where: {
        machineName_majorVersion_minorVersion: {
          machineName: input.machineName,
          majorVersion: input.majorVersion,
          minorVersion: input.minorVersion,
        },
      },
    });

    return prisma.$transaction(async (tx) => {
      let library;

      if (existing) {
        // Update patch version and assets if newer
        library = await tx.h5PLibrary.update({
          where: { id: existing.id },
          data: {
            title: input.title,
            patchVersion: Math.max(existing.patchVersion, input.patchVersion),
            runnable: input.runnable,
            fullscreen: input.fullscreen,
            coreApiVersionMajor: input.coreApiVersionMajor,
            coreApiVersionMinor: input.coreApiVersionMinor,
            preloadedJs: input.preloadedJs as Prisma.InputJsonValue,
            preloadedCss: input.preloadedCss as Prisma.InputJsonValue,
            ...(input.semantics ? { semantics: input.semantics as Prisma.InputJsonValue } : {}),
            ...(input.language ? { language: input.language as Prisma.InputJsonValue } : {}),
            tutorialUrl: input.tutorialUrl || existing.tutorialUrl,
            exampleUrl: input.exampleUrl || existing.exampleUrl,
          },
        });
      } else {
        // Create fresh library record
        library = await tx.h5PLibrary.create({
          data: {
            machineName: input.machineName,
            title: input.title,
            majorVersion: input.majorVersion,
            minorVersion: input.minorVersion,
            patchVersion: input.patchVersion,
            runnable: input.runnable,
            fullscreen: input.fullscreen,
            coreApiVersionMajor: input.coreApiVersionMajor,
            coreApiVersionMinor: input.coreApiVersionMinor,
            preloadedJs: input.preloadedJs as Prisma.InputJsonValue,
            preloadedCss: input.preloadedCss as Prisma.InputJsonValue,
            ...(input.semantics ? { semantics: input.semantics as Prisma.InputJsonValue } : {}),
            ...(input.language ? { language: input.language as Prisma.InputJsonValue } : {}),
            tutorialUrl: input.tutorialUrl,
            exampleUrl: input.exampleUrl,
          },
        });
      }

      // Resolve and link dependencies
      if (input.dependencies && input.dependencies.length > 0) {
        for (const dep of input.dependencies) {
          const reqLib = await tx.h5PLibrary.findUnique({
            where: {
              machineName_majorVersion_minorVersion: {
                machineName: dep.machineName,
                majorVersion: dep.majorVersion,
                minorVersion: dep.minorVersion,
              },
            },
          });

          if (reqLib) {
            await tx.h5PLibraryDependency.upsert({
              where: {
                libraryId_requiredLibraryId_dependencyType: {
                  libraryId: library.id,
                  requiredLibraryId: reqLib.id,
                  dependencyType: dep.dependencyType,
                },
              },
              update: {},
              create: {
                libraryId: library.id,
                requiredLibraryId: reqLib.id,
                dependencyType: dep.dependencyType,
              },
            });
          }
        }
      }

      return library;
    });
  }

  /**
   * Lists registered libraries
   */
  static async listLibraries(filters?: { runnable?: boolean; search?: string }) {
    const where: Record<string, unknown> = {};

    if (filters?.runnable !== undefined) {
      where.runnable = filters.runnable;
    }
    if (filters?.search) {
      where.OR = [
        { machineName: { contains: filters.search, mode: "insensitive" } },
        { title: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const libraries = await prisma.h5PLibrary.findMany({
      where,
      orderBy: [{ machineName: "asc" }, { majorVersion: "desc" }, { minorVersion: "desc" }],
      include: {
        _count: {
          select: {
            dependencies: true,
            requiredBy: true,
            h5pContents: true,
          },
        },
      },
    });

    return libraries.map((l) => ({
      id: l.id,
      machineName: l.machineName,
      title: l.title,
      version: `${l.majorVersion}.${l.minorVersion}.${l.patchVersion}`,
      majorVersion: l.majorVersion,
      minorVersion: l.minorVersion,
      patchVersion: l.patchVersion,
      runnable: l.runnable,
      fullscreen: l.fullscreen,
      dependenciesCount: l._count.dependencies,
      usageCount: l._count.h5pContents,
      installedAt: l.installedAt,
    }));
  }

  /**
   * Retrieves single library by ID with semantics and dependencies
   */
  static async getLibraryById(id: string) {
    const library = await prisma.h5PLibrary.findUnique({
      where: { id },
      include: {
        dependencies: {
          include: {
            requiredLibrary: {
              select: {
                id: true,
                machineName: true,
                title: true,
                majorVersion: true,
                minorVersion: true,
                patchVersion: true,
              },
            },
          },
        },
      },
    });

    if (!library) {
      throw AppError.notFound("H5PLibrary");
    }

    return library;
  }

  /**
   * Traverses the library dependency DAG and resolves the exact ordered asset list
   * (Preloaded JS & CSS) required by the client H5P player.
   */
  static async resolveAssetHierarchy(libraryId: string): Promise<ResolvedAssets> {
    const root = await prisma.h5PLibrary.findUnique({
      where: { id: libraryId },
      include: {
        dependencies: {
          where: { dependencyType: "PRELOADED" },
          include: { requiredLibrary: true },
        },
      },
    });

    if (!root) {
      throw AppError.notFound("H5PLibrary");
    }

    type LibraryItem = NonNullable<typeof root>;
    const visited = new Set<string>();
    const orderedLibraries: LibraryItem[] = [];

    // Topological DAG traversal
    async function visit(lib: LibraryItem) {
      if (visited.has(lib.id)) return;
      visited.add(lib.id);

      // Fetch preloaded dependencies
      const deps = await prisma.h5PLibraryDependency.findMany({
        where: { libraryId: lib.id, dependencyType: "PRELOADED" },
        include: { requiredLibrary: true },
      });

      for (const d of deps) {
        if (d.requiredLibrary) {
          await visit(d.requiredLibrary as unknown as LibraryItem);
        }
      }

      orderedLibraries.push(lib);
    }

    await visit(root);

    // Collect JS and CSS in dependency order
    const styles: string[] = [];
    const scripts: string[] = [];

    for (const lib of orderedLibraries) {
      const cssArr = (lib.preloadedCss as unknown as Array<{ path?: string } | string>) || [];
      for (const item of cssArr) {
        const path = typeof item === "string" ? item : item?.path;
        if (path && !styles.includes(path)) styles.push(path);
      }

      const jsArr = (lib.preloadedJs as unknown as Array<{ path?: string } | string>) || [];
      for (const item of jsArr) {
        const path = typeof item === "string" ? item : item?.path;
        if (path && !scripts.includes(path)) scripts.push(path);
      }
    }

    return {
      styles,
      scripts,
      libraries: orderedLibraries.map((l) => ({
        id: l.id,
        machineName: l.machineName,
        majorVersion: l.majorVersion,
        minorVersion: l.minorVersion,
        patchVersion: l.patchVersion,
      })),
    };
  }
}
