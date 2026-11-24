import crypto from "node:crypto";
import { prisma } from "../../database/prisma.js";
import { SCORMBundlerService, SCORMBundleOptions } from "./scorm-bundler.service.js";
import { H5PBundlerService, H5PBundleOptions } from "./h5p-bundler.service.js";
import { AppError } from "../../utils/appError.js";

export type ExportJobType = "EXPORT_SCORM" | "EXPORT_H5P";
export type ExportJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface EnqueueExportJobInput {
  organizationId: string;
  jobType: ExportJobType;
  idempotencyKey?: string;
  payload: {
    projectId: string;
    projectTitle: string;
    format: string; // "SCORM_12" | "SCORM_2004_4TH_EDITION" | "H5P"
    passingScorePercent?: number;
    launchBehavior?: "NEW_WINDOW" | "LMS_FRAME";
    slides?: any[];
    questions?: any[];
  };
}

export interface ExportJobDto {
  id: string;
  organizationId: string;
  jobType: string;
  status: ExportJobStatus;
  progress: number;
  attempts: number;
  maxAttempts: number;
  idempotencyKey?: string | null;
  errorLog?: string | null;
  result?: any;
  createdAt: string;
  completedAt?: string | null;
}

export class ExportQueueService {
  private static memoryJobs = new Map<string, any>();

  /**
   * Enqueue a new export background job with idempotency deduplication
   */
  public static async enqueueJob(input: EnqueueExportJobInput): Promise<ExportJobDto> {
    const idempotencyKey =
      input.idempotencyKey ||
      `${input.payload.projectId}-${input.payload.format}-${crypto
        .createHash("md5")
        .update(JSON.stringify(input.payload))
        .digest("hex")
        .substring(0, 10)}`;

    // 1. Try DB lookup if available
    try {
      const existing = await prisma.backgroundJob.findFirst({
        where: {
          organizationId: input.organizationId,
          jobType: input.jobType,
          idempotencyKey,
        },
      });

      if (existing) {
        if (existing.status === "QUEUED" || existing.status === "PROCESSING" || existing.status === "COMPLETED") {
          return this.mapJobToDto(existing);
        }
      }

      // Create new job in DB
      const created = await prisma.backgroundJob.create({
        data: {
          organizationId: input.organizationId,
          jobType: input.jobType,
          idempotencyKey,
          status: "QUEUED",
          payload: input.payload as any,
          maxAttempts: 3,
        },
      });

      return this.mapJobToDto(created);
    } catch {
      // 2. In-Memory fallback mode (offline or unit test without DB)
      const existingMem = Array.from(this.memoryJobs.values()).find(
        (j) =>
          j.organizationId === input.organizationId &&
          j.jobType === input.jobType &&
          j.idempotencyKey === idempotencyKey
      );

      if (existingMem) {
        return this.mapMemoryJobToDto(existingMem);
      }

      const jobId = crypto.randomUUID();
      const memJob = {
        id: jobId,
        organizationId: input.organizationId,
        jobType: input.jobType,
        idempotencyKey,
        status: "QUEUED",
        progress: 0,
        attempts: 0,
        maxAttempts: 3,
        payload: input.payload,
        result: null,
        errorLog: null,
        createdAt: new Date(),
        completedAt: null,
      };

      this.memoryJobs.set(jobId, memJob);
      return this.mapMemoryJobToDto(memJob);
    }
  }

  /**
   * Process a single queued job by ID or next in queue
   */
  public static async processJob(jobId: string, workerId = "worker-1"): Promise<ExportJobDto> {
    // 1. In-memory check
    if (this.memoryJobs.has(jobId)) {
      const job = this.memoryJobs.get(jobId);
      job.status = "PROCESSING";
      job.progress = 50;
      job.attempts += 1;

      try {
        const result = await this.executeJobPackaging(job.jobType, job.organizationId, job.payload);
        job.status = "COMPLETED";
        job.progress = 100;
        job.result = result;
        job.completedAt = new Date();
        return this.mapMemoryJobToDto(job);
      } catch (err: any) {
        job.errorLog = err.message || "Export processing error";
        job.status = job.attempts >= job.maxAttempts ? "FAILED" : "QUEUED";
        return this.mapMemoryJobToDto(job);
      }
    }

    // 2. Database path
    const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
    if (!job) {
      throw AppError.notFound("Background export job");
    }

    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: "PROCESSING",
        lockedBy: workerId,
        lockedAt: new Date(),
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    try {
      const payload = job.payload as any;
      const result = await this.executeJobPackaging(job.jobType, job.organizationId, payload);

      const updated = await prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          result: result as any,
          completedAt: new Date(),
        },
      });

      return this.mapJobToDto(updated);
    } catch (err: any) {
      const isFinalAttempt = (job.attempts + 1) >= job.maxAttempts;
      const updated = await prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: isFinalAttempt ? "FAILED" : "QUEUED",
          errorLog: err.message || "Export error occurred",
        },
      });
      return this.mapJobToDto(updated);
    }
  }

  /**
   * Internal execution router for SCORM and H5P bundlers
   */
  private static async executeJobPackaging(
    jobType: string,
    organizationId: string,
    payload: any
  ) {
    if (jobType === "EXPORT_H5P" || payload.format === "H5P") {
      const h5pOptions: H5PBundleOptions = {
        organizationId,
        projectId: payload.projectId,
        projectTitle: payload.projectTitle,
        slides: payload.slides,
        questions: payload.questions,
      };
      return H5PBundlerService.bundlePackage(h5pOptions);
    } else {
      const scormFormat =
        payload.format === "SCORM_12"
          ? "SCORM_12"
          : payload.format === "SCORM_2004_3RD_EDITION"
          ? "SCORM_2004_3RD_EDITION"
          : "SCORM_2004_4TH_EDITION";

      const scormOptions: SCORMBundleOptions = {
        organizationId,
        projectId: payload.projectId,
        projectTitle: payload.projectTitle,
        format: scormFormat,
        passingScorePercent: payload.passingScorePercent || 80,
        launchBehavior: payload.launchBehavior || "NEW_WINDOW",
        slides: payload.slides,
        questions: payload.questions,
      };
      return SCORMBundlerService.bundlePackage(scormOptions);
    }
  }

  /**
   * Get job status and details
   */
  public static async getJobById(jobId: string, organizationId?: string): Promise<ExportJobDto> {
    if (this.memoryJobs.has(jobId)) {
      const mem = this.memoryJobs.get(jobId);
      if (organizationId && mem.organizationId !== organizationId) {
        throw AppError.forbidden("Access denied to foreign tenant job");
      }
      return this.mapMemoryJobToDto(mem);
    }

    try {
      const where: any = { id: jobId };
      if (organizationId) where.organizationId = organizationId;

      const job = await prisma.backgroundJob.findFirst({ where });
      if (!job) {
        throw AppError.notFound("Export job");
      }
      return this.mapJobToDto(job);
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw AppError.notFound("Export job");
    }
  }

  private static mapJobToDto(j: any): ExportJobDto {
    const progress = j.status === "COMPLETED" ? 100 : j.status === "PROCESSING" ? 50 : 0;
    return {
      id: j.id,
      organizationId: j.organizationId,
      jobType: j.jobType,
      status: j.status,
      progress,
      attempts: j.attempts,
      maxAttempts: j.maxAttempts,
      idempotencyKey: j.idempotencyKey,
      errorLog: j.errorLog,
      result: j.result,
      createdAt: j.createdAt.toISOString ? j.createdAt.toISOString() : String(j.createdAt),
      completedAt: j.completedAt ? (j.completedAt.toISOString ? j.completedAt.toISOString() : String(j.completedAt)) : null,
    };
  }

  private static mapMemoryJobToDto(j: any): ExportJobDto {
    return {
      id: j.id,
      organizationId: j.organizationId,
      jobType: j.jobType,
      status: j.status,
      progress: j.progress,
      attempts: j.attempts,
      maxAttempts: j.maxAttempts,
      idempotencyKey: j.idempotencyKey,
      errorLog: j.errorLog,
      result: j.result,
      createdAt: j.createdAt.toISOString ? j.createdAt.toISOString() : String(j.createdAt),
      completedAt: j.completedAt ? (j.completedAt.toISOString ? j.completedAt.toISOString() : String(j.completedAt)) : null,
    };
  }
}
