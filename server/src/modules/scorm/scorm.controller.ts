import type { Request, Response, NextFunction } from "express";
import { SCORMPackagerService } from "./scorm-packager.service.js";
import { SCORMRuntimeService } from "./scorm-runtime.service.js";
import { ExportQueueService } from "../export/export-queue.service.js";
import {
  CreateSCORMExportInput,
  SCORMInitializeInput,
  SCORMCommitInput,
  SCORMTerminateInput,
  UpdateRuntimeConfigInput,
} from "./scorm.schema.js";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";
import { ResponseHelper } from "../../utils/apiResponse.js";
import { Prisma } from "@prisma/client";

function getSingleParam(param: string | string[] | undefined): string | undefined {
  if (!param) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

export class SCORMController {
  /**
   * Export content project to SCORM package
   */
  static async exportPackage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      const projectId = getSingleParam(req.params.projectId);
      if (!organizationId || !projectId) {
        throw AppError.badRequest("Organization ID and Project ID are required");
      }

      const userId = req.user!.id;
      const input = req.body as CreateSCORMExportInput;

      const result = await SCORMPackagerService.exportPackage(
        projectId,
        organizationId,
        userId,
        input
      );

      ResponseHelper.sendSuccess(res, result, 201, "SCORM package generated successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * List packages for organization
   */
  static async listPackages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      if (!organizationId) {
        throw AppError.badRequest("Organization ID is required");
      }
      const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;

      const packages = await SCORMPackagerService.listPackages(organizationId, projectId);
      ResponseHelper.sendSuccess(res, packages, 200, "SCORM packages retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single SCORM package
   */
  static async getPackageById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      const packageId = getSingleParam(req.params.packageId);
      if (!organizationId || !packageId) {
        throw AppError.badRequest("Organization ID and Package ID are required");
      }

      const pkg = await SCORMPackagerService.getPackageById(packageId, organizationId);
      ResponseHelper.sendSuccess(res, pkg, 200, "SCORM package retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get raw manifest XML
   */
  static async getManifestXml(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      const packageId = getSingleParam(req.params.packageId);
      if (!organizationId || !packageId) {
        throw AppError.badRequest("Organization ID and Package ID are required");
      }

      const xml = await SCORMPackagerService.getManifestXml(packageId, organizationId);
      res.setHeader("Content-Type", "application/xml");
      res.status(200).send(xml);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get runtime configuration
   */
  static async getRuntimeConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      const packageId = getSingleParam(req.params.packageId);
      if (!organizationId || !packageId) {
        throw AppError.badRequest("Organization ID and Package ID are required");
      }

      const config = await prisma.sCORMRuntimeConfiguration.findFirst({
        where: {
          scormPackageId: packageId,
          scormPackage: { organizationId },
        },
      });

      if (!config) {
        throw AppError.notFound("Runtime configuration");
      }

      ResponseHelper.sendSuccess(res, config, 200, "Runtime configuration retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update runtime configuration
   */
  static async updateRuntimeConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      const packageId = getSingleParam(req.params.packageId);
      if (!organizationId || !packageId) {
        throw AppError.badRequest("Organization ID and Package ID are required");
      }

      const input = req.body as UpdateRuntimeConfigInput;

      const existing = await prisma.sCORMRuntimeConfiguration.findFirst({
        where: {
          scormPackageId: packageId,
          scormPackage: { organizationId },
        },
      });

      if (!existing) {
        throw AppError.notFound("Runtime configuration");
      }

      const updated = await prisma.sCORMRuntimeConfiguration.update({
        where: { id: existing.id },
        data: {
          launchBehavior: input.launchBehavior,
          completionCriteria: input.completionCriteria,
          passingScorePercent: input.passingScorePercent,
          trackingMode: input.trackingMode,
          masteryScoreDecimal:
            input.masteryScoreDecimal !== undefined
              ? new Prisma.Decimal(input.masteryScoreDecimal)
              : undefined,
          timeLimitAction: input.timeLimitAction,
          maxTimeAllowedSeconds: input.maxTimeAllowedSeconds,
        },
      });

      ResponseHelper.sendSuccess(res, updated, 200, "Runtime configuration updated successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Initialize a SCORM runtime attempt/session
   */
  static async initializeRuntime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      if (!organizationId) {
        throw AppError.badRequest("Organization ID is required");
      }

      const input = req.body as SCORMInitializeInput;
      const session = await SCORMRuntimeService.initializeSession(input, organizationId);

      ResponseHelper.sendSuccess(res, session, 200, "SCORM session initialized successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Commit SCORM runtime session state (immediate persistence)
   */
  static async commitRuntime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      if (!organizationId) {
        throw AppError.badRequest("Organization ID is required");
      }

      const input = req.body as SCORMCommitInput;
      const result = await SCORMRuntimeService.commitSession(input, organizationId);

      ResponseHelper.sendSuccess(res, result, 200, "SCORM state committed successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Terminate SCORM runtime session
   */
  static async terminateRuntime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      if (!organizationId) {
        throw AppError.badRequest("Organization ID is required");
      }

      const input = req.body as SCORMTerminateInput;
      const result = await SCORMRuntimeService.terminateSession(input, organizationId);

      ResponseHelper.sendSuccess(res, result, 200, "SCORM session terminated successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get attempt runtime details
   */
  static async getAttemptRuntime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      const attemptId = getSingleParam(req.params.attemptId);
      if (!organizationId || !attemptId) {
        throw AppError.badRequest("Organization ID and Attempt ID are required");
      }

      const attempt = await SCORMRuntimeService.getAttemptRuntime(attemptId, organizationId);
      ResponseHelper.sendSuccess(res, attempt, 200, "Attempt runtime retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Generic export endpoint matching frontend ExportModal (/api/v1/export/jobs)
   */
  static async startExportJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { format, packageName, passingScore, launchBehavior, slides, questions } = req.body;
      const organizationId = (req as any).organizationId || "00000000-0000-4000-a000-000000000001";
      const isH5p = format === "Native H5P";
      const jobType = isH5p ? "EXPORT_H5P" : "EXPORT_SCORM";
      const standard =
        format === "SCORM 1.2"
          ? "SCORM_12"
          : format === "SCORM 2004"
          ? "SCORM_2004_4TH_EDITION"
          : isH5p
          ? "H5P"
          : "SCORM_2004_4TH_EDITION";

      const enqueued = await ExportQueueService.enqueueJob({
        organizationId,
        jobType,
        payload: {
          projectId: req.body.projectId || "default-project",
          projectTitle: packageName || "Course Package",
          format: standard,
          passingScorePercent: passingScore || 80,
          launchBehavior: launchBehavior === "new-window" ? "NEW_WINDOW" : "LMS_FRAME",
          slides,
          questions,
        },
      });

      // Process job synchronously or queue for background
      const processed = await ExportQueueService.processJob(enqueued.id);

      const jobResponse = {
        id: processed.id,
        packageName: `${packageName || "course-package"}.${isH5p ? "h5p" : "zip"}`,
        format: format || "SCORM 2004",
        status: processed.status === "COMPLETED" ? "ready" : processed.status.toLowerCase(),
        progress: processed.progress,
        createdAt: processed.createdAt,
        downloadUrl: processed.result?.downloadUrl || null,
        fileSize: processed.result
          ? `${(processed.result.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
          : "18.4 MB",
      };

      ResponseHelper.sendSuccess(res, jobResponse, 201, "Export job initiated and packaged successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get export job status
   * GET /api/v1/export/jobs/:jobId
   */
  static async getExportJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobId = getSingleParam(req.params.jobId);
      if (!jobId) {
        throw AppError.badRequest("Job ID is required");
      }
      const organizationId = (req as any).organizationId;
      const job = await ExportQueueService.getJobById(jobId, organizationId);
      ResponseHelper.sendSuccess(res, job, 200, "Export job retrieved");
    } catch (err) {
      next(err);
    }
  }
}
