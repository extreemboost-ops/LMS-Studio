import { z } from "zod";

/**
 * Supported SCORM standards matching Prisma enum SCORMStandard
 */
export const scormStandardEnum = z.enum([
  "SCORM_12",
  "SCORM_2004_3RD_EDITION",
  "SCORM_2004_4TH_EDITION",
]);
export type SCORMStandardType = z.infer<typeof scormStandardEnum>;

export const launchBehaviorEnum = z.enum(["NEW_WINDOW", "LMS_FRAME"]);
export const completionCriteriaEnum = z.enum([
  "SLIDES_VIEWED",
  "QUIZ_PASSED",
  "BOTH",
  "INTERACTIONS_COMPLETE",
]);
export const trackingModeEnum = z.enum(["SCORE_AND_STATUS", "STATUS_ONLY"]);

/**
 * Export creation schema
 */
export const createSCORMExportSchema = z.object({
  format: scormStandardEnum.default("SCORM_2004_4TH_EDITION"),
  packageTitle: z.string().min(1).max(255),
  versionString: z.string().max(50).default("1.0.0"),
  contentVersionId: z.string().uuid().optional(),
  launchBehavior: launchBehaviorEnum.default("NEW_WINDOW"),
  completionCriteria: completionCriteriaEnum.default("BOTH"),
  passingScorePercent: z.number().int().min(0).max(100).default(80),
  trackingMode: trackingModeEnum.default("SCORE_AND_STATUS"),
  masteryScoreDecimal: z.number().min(0).max(1).default(0.8),
  timeLimitAction: z.string().max(50).default("continue,no message"),
  maxTimeAllowedSeconds: z.number().int().positive().optional(),
});
export type CreateSCORMExportInput = z.infer<typeof createSCORMExportSchema>;

/**
 * Runtime configuration update schema
 */
export const updateRuntimeConfigSchema = z.object({
  launchBehavior: launchBehaviorEnum.optional(),
  completionCriteria: completionCriteriaEnum.optional(),
  passingScorePercent: z.number().int().min(0).max(100).optional(),
  trackingMode: trackingModeEnum.optional(),
  masteryScoreDecimal: z.number().min(0).max(1).optional(),
  timeLimitAction: z.string().max(50).optional(),
  maxTimeAllowedSeconds: z.number().int().positive().nullable().optional(),
});
export type UpdateRuntimeConfigInput = z.infer<typeof updateRuntimeConfigSchema>;

/**
 * Runtime Session Initialization Schema
 */
export const scormInitializeSchema = z.object({
  attemptId: z.string().uuid().optional(),
  learnerId: z.string().uuid(),
  contentProjectId: z.string().uuid(),
  scormPackageId: z.string().uuid().optional(),
  scormStandard: scormStandardEnum.default("SCORM_12"),
  mode: z.enum(["normal", "review", "browse"]).default("normal"),
  credit: z.enum(["credit", "no-credit"]).default("credit"),
  userAgent: z.string().max(512).optional(),
  ipAddress: z.string().max(45).optional(),
});
export type SCORMInitializeInput = z.infer<typeof scormInitializeSchema>;

/**
 * SCORM SetValue schema
 */
export const scormSetValueSchema = z.object({
  element: z.string().min(1),
  value: z.string(),
});
export type SCORMSetValueInput = z.infer<typeof scormSetValueSchema>;

/**
 * Interaction recording schema
 */
export const scormInteractionSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum([
    "true-false",
    "choice",
    "fill-in",
    "long-fill-in",
    "matching",
    "performance",
    "sequencing",
    "likert",
    "numeric",
    "other",
  ]),
  timestamp: z.string().optional(),
  weighting: z.number().optional(),
  learner_response: z.union([z.string(), z.array(z.string()), z.number()]),
  result: z.enum(["correct", "incorrect", "wrong", "unanticipated", "neutral"]).or(z.number()),
  latency: z.string().optional(), // ISO 8601 duration or seconds
  description: z.string().max(500).optional(),
});
export type SCORMInteractionInput = z.infer<typeof scormInteractionSchema>;

/**
 * Runtime Commit schema
 */
export const scormCommitSchema = z.object({
  attemptId: z.string().uuid(),
  scormStandard: scormStandardEnum,
  values: z.record(z.string(), z.string()).optional(),
  location: z.string().max(1000).optional(),
  suspendData: z.string().optional(),
  lessonStatus: z.string().max(20).optional(), // SCORM 1.2
  completionStatus: z.string().max(20).optional(), // SCORM 2004
  successStatus: z.string().max(20).optional(), // SCORM 2004
  scoreRaw: z.number().min(0).max(1000).optional(),
  scoreScaled: z.number().min(-1).max(1).optional(),
  scoreMin: z.number().optional(),
  scoreMax: z.number().optional(),
  progressMeasure: z.number().min(0).max(1).optional(),
  sessionTime: z.string().optional(),
  exit: z.enum(["time-out", "suspend", "logout", "normal", ""]).optional(),
  interactions: z.array(scormInteractionSchema).optional(),
});
export type SCORMCommitInput = z.infer<typeof scormCommitSchema>;

/**
 * Runtime Terminate schema
 */
export const scormTerminateSchema = z.object({
  attemptId: z.string().uuid(),
  scormStandard: scormStandardEnum,
  sessionTime: z.string().optional(),
  exit: z.enum(["time-out", "suspend", "logout", "normal", ""]).optional(),
  finalValues: z.record(z.string(), z.string()).optional(),
});
export type SCORMTerminateInput = z.infer<typeof scormTerminateSchema>;
