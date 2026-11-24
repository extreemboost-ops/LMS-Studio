import { Router } from "express";
import { SCORMController } from "./scorm.controller.js";
import { requireAuth } from "../../middlewares/auth.js";
import { resolveTenantContext } from "../../middlewares/tenantContext.js";
import { requirePermission } from "../../middlewares/rbac.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import {
  createSCORMExportSchema,
  updateRuntimeConfigSchema,
  scormInitializeSchema,
  scormCommitSchema,
  scormTerminateSchema,
} from "./scorm.schema.js";

// Project SCORM Export Router: /api/v1/organizations/:organizationId/projects/:projectId/scorm
export const projectSCORMExportRoutes = Router({ mergeParams: true });
projectSCORMExportRoutes.use(requireAuth);
projectSCORMExportRoutes.use(resolveTenantContext);

projectSCORMExportRoutes.post(
  "/export",
  requirePermission("content:publish"),
  validateRequest({ body: createSCORMExportSchema }),
  SCORMController.exportPackage
);

// Organization SCORM Management Router: /api/v1/organizations/:organizationId/scorm
export const organizationSCORMRoutes = Router({ mergeParams: true });
organizationSCORMRoutes.use(requireAuth);
organizationSCORMRoutes.use(resolveTenantContext);

// Packages & Manifests
organizationSCORMRoutes.get("/packages", requirePermission("content:view"), SCORMController.listPackages);
organizationSCORMRoutes.get("/packages/:packageId", requirePermission("content:view"), SCORMController.getPackageById);
organizationSCORMRoutes.get("/packages/:packageId/manifest", requirePermission("content:view"), SCORMController.getManifestXml);
organizationSCORMRoutes.get("/packages/:packageId/runtime-config", requirePermission("content:view"), SCORMController.getRuntimeConfig);
organizationSCORMRoutes.put(
  "/packages/:packageId/runtime-config",
  requirePermission("content:edit"),
  validateRequest({ body: updateRuntimeConfigSchema }),
  SCORMController.updateRuntimeConfig
);

// Runtime Engine & Learner Tracking
organizationSCORMRoutes.post(
  "/runtime/initialize",
  validateRequest({ body: scormInitializeSchema }),
  SCORMController.initializeRuntime
);
organizationSCORMRoutes.post(
  "/runtime/commit",
  validateRequest({ body: scormCommitSchema }),
  SCORMController.commitRuntime
);
organizationSCORMRoutes.post(
  "/runtime/terminate",
  validateRequest({ body: scormTerminateSchema }),
  SCORMController.terminateRuntime
);
organizationSCORMRoutes.get(
  "/runtime/attempts/:attemptId",
  requirePermission("content:view"),
  SCORMController.getAttemptRuntime
);

// Global Export Job Router: /api/v1/export
export const globalExportRoutes = Router();
globalExportRoutes.post("/jobs", SCORMController.startExportJob);
globalExportRoutes.get("/jobs/:jobId", SCORMController.getExportJob);
