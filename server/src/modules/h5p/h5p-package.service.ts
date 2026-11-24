import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";
import type { CreatePackageImportInput } from "./h5p.schema.js";

export interface H5PManifestValidationResult {
  isValid: boolean;
  errors: string[];
  manifest?: {
    title: string;
    mainLibrary: string;
    language: string;
    preloadedDependencies: Array<{
      machineName: string;
      majorVersion: number;
      minorVersion: number;
    }>;
  };
}

export class H5PPackageService {
  /**
   * Validates the structure and dependencies of an h5p.json manifest
   */
  static validateManifest(rawManifest: unknown): H5PManifestValidationResult {
    const errors: string[] = [];

    if (typeof rawManifest !== "object" || rawManifest === null) {
      return { isValid: false, errors: ["Invalid manifest: JSON object expected"] };
    }

    const m = rawManifest as Record<string, unknown>;

    if (!m.title || typeof m.title !== "string") {
      errors.push("Manifest missing required 'title' string");
    }

    if (!m.mainLibrary || typeof m.mainLibrary !== "string") {
      errors.push("Manifest missing required 'mainLibrary' identifier");
    } else {
      const parts = m.mainLibrary.split(" ");
      if (parts.length !== 2 || !parts[1].includes(".")) {
        errors.push(`Invalid 'mainLibrary' format: expected 'Library.Name Major.Minor', got '${m.mainLibrary}'`);
      }
    }

    const preloadedDeps: Array<{ machineName: string; majorVersion: number; minorVersion: number }> = [];

    if (m.preloadedDependencies) {
      if (!Array.isArray(m.preloadedDependencies)) {
        errors.push("'preloadedDependencies' must be an array");
      } else {
        for (const dep of m.preloadedDependencies) {
          if (
            typeof dep === "object" &&
            dep !== null &&
            typeof dep.machineName === "string" &&
            typeof dep.majorVersion === "number" &&
            typeof dep.minorVersion === "number"
          ) {
            preloadedDeps.push({
              machineName: dep.machineName,
              majorVersion: dep.majorVersion,
              minorVersion: dep.minorVersion,
            });
          } else {
            errors.push("Malformed dependency item in 'preloadedDependencies'");
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      manifest: {
        title: String(m.title || ""),
        mainLibrary: String(m.mainLibrary || ""),
        language: typeof m.language === "string" ? m.language : "en",
        preloadedDependencies: preloadedDeps,
      },
    };
  }

  /**
   * Checks whether all required libraries for an import package are installed in the registry
   */
  static async checkMissingDependencies(
    dependencies: Array<{ machineName: string; majorVersion: number; minorVersion: number }>
  ) {
    const missing: Array<{ machineName: string; majorVersion: number; minorVersion: number }> = [];

    for (const dep of dependencies) {
      const found = await prisma.h5PLibrary.findUnique({
        where: {
          machineName_majorVersion_minorVersion: {
            machineName: dep.machineName,
            majorVersion: dep.majorVersion,
            minorVersion: dep.minorVersion,
          },
        },
      });

      if (!found) {
        missing.push(dep);
      }
    }

    return {
      allInstalled: missing.length === 0,
      missing,
    };
  }

  /**
   * Registers a package import job in the database
   */
  static async createImportJob(
    organizationId: string,
    userId: string,
    input: CreatePackageImportInput
  ) {
    const workspace = await prisma.workspace.findFirst({
      where: { id: input.workspaceId, organizationId },
    });

    if (!workspace) {
      throw AppError.notFound("Workspace");
    }

    const job = await prisma.h5PPackageImport.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId,
        createdById: userId,
        filename: input.filename,
        fileSizeBytes: BigInt(input.fileSizeBytes),
        status: "QUEUED",
      },
    });

    return {
      id: job.id,
      filename: job.filename,
      fileSizeBytes: Number(job.fileSizeBytes),
      status: job.status,
      createdAt: job.createdAt,
    };
  }
}
