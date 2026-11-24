import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";
import {
  SCORMInitializeInput,
  SCORMCommitInput,
  SCORMTerminateInput,
  SCORMStandardType,
} from "./scorm.schema.js";
import { Prisma } from "@prisma/client";

/**
 * SCORM Time Helpers
 */
export class SCORMTimeHelper {
  /**
   * Parse SCORM 1.2 session time (format: "HH:MM:SS" or "HH:MM:SS.SS") into integer seconds
   */
  static parseScorm12Time(timeStr: string): number {
    if (!timeStr || typeof timeStr !== "string") return 0;
    const parts = timeStr.trim().split(":");
    if (parts.length < 3) return 0;
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = Math.floor(parseFloat(parts[2]) || 0);
    return Math.max(0, hours * 3600 + minutes * 60 + seconds);
  }

  /**
   * Format integer seconds to SCORM 1.2 "HH:MM:SS"
   */
  static formatScorm12Time(totalSeconds: number): string {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":");
  }

  /**
   * Parse SCORM 2004 ISO 8601 duration (e.g., "PT1H30M15S", "PT45S", "P0Y0M0DT1H0M0S") into seconds
   */
  static parseScorm2004Time(isoDuration: string): number {
    if (!isoDuration || typeof isoDuration !== "string") return 0;
    const regex = /P(?:([0-9]+)Y)?(?:([0-9]+)M)?(?:([0-9]+)D)?(?:T(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+(?:\.[0-9]+)?)S)?)?/;
    const matches = isoDuration.trim().match(regex);
    if (!matches) return 0;

    const days = parseInt(matches[3] || "0", 10);
    const hours = parseInt(matches[4] || "0", 10);
    const minutes = parseInt(matches[5] || "0", 10);
    const seconds = Math.floor(parseFloat(matches[6] || "0"));

    return Math.max(0, days * 86400 + hours * 3600 + minutes * 60 + seconds);
  }

  /**
   * Format integer seconds to SCORM 2004 ISO 8601 duration (e.g. "PT1H30M15S")
   */
  static formatScorm2004Time(totalSeconds: number): string {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;

    let res = "PT";
    if (hours > 0) res += `${hours}H`;
    if (minutes > 0) res += `${minutes}M`;
    if (seconds > 0 || (hours === 0 && minutes === 0)) res += `${seconds}S`;
    return res;
  }
}

/**
 * SCORM Runtime Engine Service
 * Implements strict SCORM 1.2 and SCORM 2004 state management with immediate persistence
 */
export class SCORMRuntimeService {
  /**
   * Initialize a learning attempt and SCORM runtime session
   */
  static async initializeSession(input: SCORMInitializeInput, organizationId: string) {
    // 1. Verify project exists and belongs to tenant
    const project = await prisma.contentProject.findFirst({
      where: { id: input.contentProjectId, organizationId },
    });
    if (!project) {
      throw AppError.notFound("Content project");
    }

    // 2. Verify or locate learner
    const learner = await prisma.learner.findFirst({
      where: { id: input.learnerId, organizationId },
    });
    if (!learner) {
      throw AppError.notFound("Learner");
    }

    // 3. Find existing attempt or create new attempt
    let attempt = input.attemptId
      ? await prisma.learningAttempt.findFirst({
          where: { id: input.attemptId, organizationId },
          include: { scormRuntime: true },
        })
      : await prisma.learningAttempt.findFirst({
          where: {
            learnerId: input.learnerId,
            contentProjectId: input.contentProjectId,
            organizationId,
            status: { in: ["INCOMPLETE", "NOT_ATTEMPTED"] },
          },
          orderBy: { attemptNumber: "desc" },
          include: { scormRuntime: true },
        });

    if (!attempt) {
      const highestAttempt = await prisma.learningAttempt.findFirst({
        where: { learnerId: input.learnerId, contentProjectId: input.contentProjectId },
        orderBy: { attemptNumber: "desc" },
        select: { attemptNumber: true },
      });
      const nextAttemptNumber = (highestAttempt?.attemptNumber || 0) + 1;

      attempt = await prisma.learningAttempt.create({
        data: {
          organizationId,
          learnerId: input.learnerId,
          contentProjectId: input.contentProjectId,
          scormPackageId: input.scormPackageId || null,
          attemptNumber: nextAttemptNumber,
          status: "INCOMPLETE",
          totalTimeSeconds: 0,
        },
        include: { scormRuntime: true },
      });
    }

    // 4. Ensure SCORMRuntimeRecord exists
    let runtimeRecord = attempt.scormRuntime;
    if (!runtimeRecord) {
      runtimeRecord = await prisma.sCORMRuntimeRecord.create({
        data: {
          attemptId: attempt.id,
          scormStandard: input.scormStandard,
          cmiMode: input.mode,
          cmiCredit: input.credit,
          cmiEntry: attempt.totalTimeSeconds > 0 ? "resume" : "ab-initio",
          cmiLessonStatus: input.scormStandard === "SCORM_12" ? "incomplete" : null,
          cmiCompletionStatus: input.scormStandard !== "SCORM_12" ? "incomplete" : null,
          cmiSuccessStatus: input.scormStandard !== "SCORM_12" ? "unknown" : null,
          cmiInteractionsJson: [],
          cmiObjectivesJson: [],
          rawCmiTree: {},
        },
      });
    }

    if (!runtimeRecord) {
      throw new AppError(500, "RUNTIME_RECORD_ERROR", "Failed to initialize SCORM runtime record");
    }

    // 5. Create LearningSession record
    const session = await prisma.learningSession.create({
      data: {
        attemptId: attempt.id,
        userAgent: input.userAgent || null,
        ipAddress: input.ipAddress || null,
      },
    });

    // 6. Build standard-specific initial CMI tree
    const cmiTree = this.buildInitialCMITree(
      input.scormStandard,
      attempt,
      runtimeRecord,
      learner
    );

    return {
      success: true,
      sessionId: session.id,
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      scormStandard: input.scormStandard,
      cmi: cmiTree,
    };
  }

  /**
   * Build initial CMI tree based on standard
   */
  private static buildInitialCMITree(
    standard: SCORMStandardType,
    attempt: { totalTimeSeconds: number; scoreRaw: Prisma.Decimal | null; scoreScaled: Prisma.Decimal | null },
    runtime: {
      cmiLocation: string | null;
      cmiSuspendData: string | null;
      cmiLessonStatus: string | null;
      cmiCompletionStatus: string | null;
      cmiSuccessStatus: string | null;
      cmiMode: string | null;
      cmiCredit: string | null;
      cmiEntry: string | null;
      cmiLaunchData: string | null;
      rawCmiTree: Prisma.JsonValue;
    },
    learner: { id: string; email: string; firstName?: string | null; lastName?: string | null }
  ): Record<string, string> {
    const fullName = [learner.firstName, learner.lastName].filter(Boolean).join(" ") || learner.email;

    if (standard === "SCORM_12") {
      return {
        "cmi.core._children": "student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,exit,session_time",
        "cmi.core.student_id": learner.id,
        "cmi.core.student_name": fullName,
        "cmi.core.lesson_location": runtime.cmiLocation || "",
        "cmi.core.credit": runtime.cmiCredit || "credit",
        "cmi.core.lesson_status": runtime.cmiLessonStatus || "incomplete",
        "cmi.core.entry": runtime.cmiEntry || "ab-initio",
        "cmi.core.score_children": "raw,min,max",
        "cmi.core.score.raw": attempt.scoreRaw !== null ? attempt.scoreRaw.toString() : "",
        "cmi.core.score.min": "0",
        "cmi.core.score.max": "100",
        "cmi.core.total_time": SCORMTimeHelper.formatScorm12Time(attempt.totalTimeSeconds),
        "cmi.core.lesson_mode": runtime.cmiMode || "normal",
        "cmi.core.exit": "",
        "cmi.core.session_time": "00:00:00",
        "cmi.suspend_data": runtime.cmiSuspendData || "",
        "cmi.launch_data": runtime.cmiLaunchData || "",
        "cmi.comments": "",
        "cmi.comments_from_lms": "",
      };
    }

    // SCORM 2004 3rd & 4th Edition
    return {
      "cmi._version": "1.0",
      "cmi.completion_status": runtime.cmiCompletionStatus || "incomplete",
      "cmi.success_status": runtime.cmiSuccessStatus || "unknown",
      "cmi.location": runtime.cmiLocation || "",
      "cmi.mode": runtime.cmiMode || "normal",
      "cmi.credit": runtime.cmiCredit || "credit",
      "cmi.entry": runtime.cmiEntry || "ab-initio",
      "cmi.exit": "",
      "cmi.score._children": "scaled,raw,min,max",
      "cmi.score.raw": attempt.scoreRaw !== null ? attempt.scoreRaw.toString() : "",
      "cmi.score.scaled": attempt.scoreScaled !== null ? attempt.scoreScaled.toString() : "",
      "cmi.score.min": "0",
      "cmi.score.max": "100",
      "cmi.total_time": SCORMTimeHelper.formatScorm2004Time(attempt.totalTimeSeconds),
      "cmi.session_time": "PT0S",
      "cmi.suspend_data": runtime.cmiSuspendData || "",
      "cmi.launch_data": runtime.cmiLaunchData || "",
      "cmi.learner_id": learner.id,
      "cmi.learner_name": fullName,
    };
  }

  /**
   * Commit runtime state immediately to database (Phase 02.2 Fix: zero-debounce immediate persistence)
   */
  static async commitSession(input: SCORMCommitInput, organizationId: string) {
    const attempt = await prisma.learningAttempt.findFirst({
      where: { id: input.attemptId, organizationId },
      include: { scormRuntime: true },
    });
    if (!attempt || !attempt.scormRuntime) {
      throw AppError.notFound("Learning attempt or SCORM record");
    }

    // Validate suspend_data limits strictly according to specification
    if (input.suspendData !== undefined) {
      if (input.scormStandard === "SCORM_12" && input.suspendData.length > 4096) {
        throw new AppError(
          400,
          "SCORM_SUSPEND_DATA_EXCEEDED",
          "SCORM 1.2 suspend_data limit exceeded: maximum allowed is 4,096 characters (received " +
            input.suspendData.length +
            ")"
        );
      }
      if (
        (input.scormStandard === "SCORM_2004_3RD_EDITION" ||
          input.scormStandard === "SCORM_2004_4TH_EDITION") &&
        input.suspendData.length > 64000
      ) {
        throw new AppError(
          400,
          "SCORM_SUSPEND_DATA_EXCEEDED",
          "SCORM 2004 suspend_data limit exceeded: maximum allowed is 64,000 characters (received " +
            input.suspendData.length +
            ")"
        );
      }
    }

    // Parse incremental session time if provided
    let additionalSeconds = 0;
    if (input.sessionTime) {
      if (input.scormStandard === "SCORM_12") {
        additionalSeconds = SCORMTimeHelper.parseScorm12Time(input.sessionTime);
      } else {
        additionalSeconds = SCORMTimeHelper.parseScorm2004Time(input.sessionTime);
      }
    }

    const updatedTotalSeconds = attempt.totalTimeSeconds + additionalSeconds;

    // Transactional Dual-Write: SCORMRuntimeRecord & LearningAttempt
    const [updatedRuntime, updatedAttempt] = await prisma.$transaction(async (tx) => {
      // 1. Update latest session time
      if (additionalSeconds > 0) {
        const latestSession = await tx.learningSession.findFirst({
          where: { attemptId: attempt.id },
          orderBy: { sessionStartTime: "desc" },
        });
        if (latestSession) {
          await tx.learningSession.update({
            where: { id: latestSession.id },
            data: {
              sessionTimeSeconds: latestSession.sessionTimeSeconds + additionalSeconds,
            },
          });
        }
      }

      // 2. Record assessment results / interactions
      if (input.interactions && input.interactions.length > 0) {
        for (const inter of input.interactions) {
          const isCorrect =
            inter.result === "correct" || (typeof inter.result === "number" && inter.result > 0);
          const points = typeof inter.result === "number" ? inter.result : isCorrect ? 1.0 : 0.0;

          await tx.assessmentResult.create({
            data: {
              attemptId: attempt.id,
              questionId: inter.id,
              questionTitle: inter.description || `Question ${inter.id}`,
              questionType: inter.type.toUpperCase(),
              learnerAnswerJson: (inter.learner_response as Prisma.InputJsonValue) ?? {},
              isCorrect,
              pointsAwarded: new Prisma.Decimal(points),
              pointsPossible: new Prisma.Decimal(inter.weighting ?? 1.0),
              latencySeconds: inter.latency ? SCORMTimeHelper.parseScorm2004Time(inter.latency) : null,
            },
          });
        }
      }

      // 3. Update SCORMRuntimeRecord
      const currentInteractions = (attempt.scormRuntime?.cmiInteractionsJson as unknown[]) || [];
      const mergedInteractions = input.interactions
        ? [...currentInteractions, ...input.interactions]
        : currentInteractions;

      const runtime = await tx.sCORMRuntimeRecord.update({
        where: { id: attempt.scormRuntime!.id },
        data: {
          cmiLocation: input.location !== undefined ? input.location : attempt.scormRuntime!.cmiLocation,
          cmiSuspendData:
            input.suspendData !== undefined ? input.suspendData : attempt.scormRuntime!.cmiSuspendData,
          cmiLessonStatus:
            input.lessonStatus !== undefined ? input.lessonStatus : attempt.scormRuntime!.cmiLessonStatus,
          cmiCompletionStatus:
            input.completionStatus !== undefined
              ? input.completionStatus
              : attempt.scormRuntime!.cmiCompletionStatus,
          cmiSuccessStatus:
            input.successStatus !== undefined
              ? input.successStatus
              : attempt.scormRuntime!.cmiSuccessStatus,
          cmiExit: input.exit || attempt.scormRuntime!.cmiExit,
          cmiProgressMeasure:
            input.progressMeasure !== undefined
              ? new Prisma.Decimal(input.progressMeasure)
              : attempt.scormRuntime!.cmiProgressMeasure,
          cmiInteractionsJson: mergedInteractions as Prisma.InputJsonValue,
          ...(input.values ? { rawCmiTree: input.values as Prisma.InputJsonValue } : {}),
          lastSynchronizedAt: new Date(),
        },
      });

      // 4. Update LearningAttempt
      let attemptStatus = attempt.status;
      if (input.scormStandard === "SCORM_12" && input.lessonStatus) {
        const ls = input.lessonStatus.toLowerCase();
        if (ls === "passed") attemptStatus = "PASSED";
        else if (ls === "completed") attemptStatus = "COMPLETED";
        else if (ls === "failed") attemptStatus = "FAILED";
        else if (ls === "incomplete") attemptStatus = "INCOMPLETE";
      } else if (input.scormStandard !== "SCORM_12") {
        if (input.successStatus === "passed") attemptStatus = "PASSED";
        else if (input.successStatus === "failed") attemptStatus = "FAILED";
        else if (input.completionStatus === "completed" && attemptStatus !== "PASSED") {
          attemptStatus = "COMPLETED";
        }
      }

      const att = await tx.learningAttempt.update({
        where: { id: attempt.id },
        data: {
          totalTimeSeconds: updatedTotalSeconds,
          scoreRaw: input.scoreRaw !== undefined ? new Prisma.Decimal(input.scoreRaw) : attempt.scoreRaw,
          scoreScaled:
            input.scoreScaled !== undefined ? new Prisma.Decimal(input.scoreScaled) : attempt.scoreScaled,
          scoreMin: input.scoreMin !== undefined ? new Prisma.Decimal(input.scoreMin) : attempt.scoreMin,
          scoreMax: input.scoreMax !== undefined ? new Prisma.Decimal(input.scoreMax) : attempt.scoreMax,
          status: attemptStatus,
        },
      });

      return [runtime, att];
    });

    return {
      success: true,
      persistedAt: updatedRuntime.lastSynchronizedAt.toISOString(),
      totalTimeSeconds: updatedAttempt.totalTimeSeconds,
      status: updatedAttempt.status,
      scoreRaw: updatedAttempt.scoreRaw ? Number(updatedAttempt.scoreRaw) : null,
      scoreScaled: updatedAttempt.scoreScaled ? Number(updatedAttempt.scoreScaled) : null,
      location: updatedRuntime.cmiLocation,
    };
  }

  /**
   * Terminate a runtime session: flushes final state, calculates final metrics, and closes session
   */
  static async terminateSession(input: SCORMTerminateInput, organizationId: string) {
    const attempt = await prisma.learningAttempt.findFirst({
      where: { id: input.attemptId, organizationId },
      include: { scormRuntime: true },
    });
    if (!attempt || !attempt.scormRuntime) {
      throw AppError.notFound("Learning attempt or SCORM record");
    }

    // Parse final session time
    let sessionSeconds = 0;
    if (input.sessionTime) {
      if (input.scormStandard === "SCORM_12") {
        sessionSeconds = SCORMTimeHelper.parseScorm12Time(input.sessionTime);
      } else {
        sessionSeconds = SCORMTimeHelper.parseScorm2004Time(input.sessionTime);
      }
    }

    const finalTotalSeconds = attempt.totalTimeSeconds + sessionSeconds;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Close current session
      const currentSession = await tx.learningSession.findFirst({
        where: { attemptId: attempt.id, sessionEndTime: null },
        orderBy: { sessionStartTime: "desc" },
      });
      if (currentSession) {
        await tx.learningSession.update({
          where: { id: currentSession.id },
          data: {
            sessionEndTime: now,
            sessionTimeSeconds: currentSession.sessionTimeSeconds + sessionSeconds,
          },
        });
      }

      // 2. Finalize SCORMRuntimeRecord
      await tx.sCORMRuntimeRecord.update({
        where: { id: attempt.scormRuntime!.id },
        data: {
          cmiExit: input.exit || "normal",
          lastSynchronizedAt: now,
        },
      });

      // 3. Finalize attempt completion
      const finalized = await tx.learningAttempt.update({
        where: { id: attempt.id },
        data: {
          completedAt: now,
          totalTimeSeconds: finalTotalSeconds,
        },
      });

      return finalized;
    });

    return {
      success: true,
      attemptId: result.id,
      status: result.status,
      totalTimeSeconds: result.totalTimeSeconds,
      completedAt: result.completedAt?.toISOString(),
    };
  }

  /**
   * Get complete attempt details & runtime data
   */
  static async getAttemptRuntime(attemptId: string, organizationId: string) {
    const attempt = await prisma.learningAttempt.findFirst({
      where: { id: attemptId, organizationId },
      include: {
        scormRuntime: true,
        sessions: { orderBy: { sessionStartTime: "desc" } },
        assessmentResults: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!attempt) {
      throw AppError.notFound("Learning attempt");
    }

    return attempt;
  }
}
