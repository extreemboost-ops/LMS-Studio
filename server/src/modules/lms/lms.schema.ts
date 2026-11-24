import { z } from "zod";

export const lmsPlatformCodeEnum = z.enum([
  "MOODLE",
  "CANVAS",
  "BLACKBOARD",
  "DOCEBO",
  "BRIGHTSPACE",
  "CUSTOM",
]);
export type LMSPlatformCodeType = z.infer<typeof lmsPlatformCodeEnum>;

export const lmsAuthTypeEnum = z.enum(["OAUTH2", "LTI_13", "API_KEY"]);
export type LMSAuthType = z.infer<typeof lmsAuthTypeEnum>;

export const lmsConnectionStatusEnum = z.enum([
  "CONNECTED",
  "DISCONNECTED",
  "DEGRADED",
  "ERROR",
]);

export const lmsHealthStatusEnum = z.enum(["HEALTHY", "WARNING", "DOWN"]);

export const lmsDeploymentStatusEnum = z.enum(["ACTIVE", "ARCHIVED", "SYNC_PENDING"]);

/**
 * LMS Connection Creation Schema
 */
export const createLMSConnectionSchema = z.object({
  workspaceId: z.string().uuid(),
  platformCode: lmsPlatformCodeEnum,
  name: z.string().min(1).max(150),
  apiBaseUrl: z.string().url().max(512).optional(),
  authType: lmsAuthTypeEnum.default("OAUTH2"),
  credentials: z.object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    apiKey: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    deploymentId: z.string().optional(),
    iss: z.string().optional(),
    jwksUrl: z.string().url().optional(),
    authUrl: z.string().url().optional(),
    tokenUrl: z.string().url().optional(),
    customHeaders: z.record(z.string(), z.string()).optional(),
  }),
});
export type CreateLMSConnectionInput = z.infer<typeof createLMSConnectionSchema>;

/**
 * LMS Connection Update Schema
 */
export const updateLMSConnectionSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  apiBaseUrl: z.string().url().max(512).optional(),
  authType: lmsAuthTypeEnum.optional(),
  credentials: z.object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    apiKey: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    deploymentId: z.string().optional(),
    iss: z.string().optional(),
    jwksUrl: z.string().url().optional(),
    authUrl: z.string().url().optional(),
    tokenUrl: z.string().url().optional(),
    customHeaders: z.record(z.string(), z.string()).optional(),
  }).optional(),
});
export type UpdateLMSConnectionInput = z.infer<typeof updateLMSConnectionSchema>;

/**
 * LMS Deployment Creation Schema (publishing a course/content to an LMS)
 */
export const createLMSDeploymentSchema = z.object({
  lmsConnectionId: z.string().uuid(),
  courseId: z.string().uuid().optional(),
  contentProjectId: z.string().uuid().optional(),
  scormPackageId: z.string().uuid().optional(),
  externalCourseId: z.string().max(100).optional(),
  externalActivityId: z.string().max(100).optional(),
  title: z.string().min(1).max(255).optional(),
});
export type CreateLMSDeploymentInput = z.infer<typeof createLMSDeploymentSchema>;

/**
 * Grade Push Schema (pushing learner results to LMS gradebook)
 */
export const lmsGradePushSchema = z.object({
  deploymentId: z.string().uuid(),
  learnerId: z.string().uuid(),
  scoreGiven: z.number().min(0),
  scoreMaximum: z.number().positive().default(100),
  activityProgress: z.enum([
    "Initialized",
    "Started",
    "InProgress",
    "Submitted",
    "Completed",
  ]).default("Completed"),
  gradingProgress: z.enum([
    "FullyGraded",
    "Pending",
    "PendingManual",
    "Failed",
    "NotReady",
  ]).default("FullyGraded"),
  comment: z.string().max(500).optional(),
});
export type LMSGradePushInput = z.infer<typeof lmsGradePushSchema>;

/**
 * LTI 1.3 OIDC Login Initiation Schema
 */
export const ltiLoginInitiationSchema = z.object({
  iss: z.string().url(),
  login_hint: z.string().min(1),
  target_link_uri: z.string().url(),
  lti_message_hint: z.string().optional(),
  client_id: z.string().min(1),
  lti_deployment_id: z.string().optional(),
});
export type LTILoginInitiationInput = z.infer<typeof ltiLoginInitiationSchema>;

/**
 * LTI 1.3 Launch Payload Schema
 */
export const ltiLaunchSchema = z.object({
  id_token: z.string().min(10),
  state: z.string().min(10),
});
export type LTILaunchInput = z.infer<typeof ltiLaunchSchema>;
