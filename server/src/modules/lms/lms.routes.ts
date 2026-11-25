import { Router } from "express";
import { LMSController } from "./lms.controller.js";
import { requireAuth } from "../../middlewares/auth.js";
import { resolveTenantContext } from "../../middlewares/tenantContext.js";
import { requirePermission } from "../../middlewares/rbac.js";
import { requireFeature } from "../../middlewares/entitlements.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import {
  createLMSConnectionSchema,
  updateLMSConnectionSchema,
  createLMSDeploymentSchema,
  lmsGradePushSchema,
  ltiLoginInitiationSchema,
  ltiLaunchSchema,
} from "./lms.schema.js";

// Public LTI 1.3 Router: /api/v1/lti/1.3
export const publicLtiRoutes = Router();
publicLtiRoutes.get("/jwks", LMSController.getPublicJWKS);
publicLtiRoutes.get(
  "/login_initiations",
  validateRequest({ query: ltiLoginInitiationSchema }),
  LMSController.loginInitiation
);
publicLtiRoutes.post(
  "/login_initiations",
  validateRequest({ body: ltiLoginInitiationSchema }),
  LMSController.loginInitiation
);
publicLtiRoutes.post(
  "/launch",
  validateRequest({ body: ltiLaunchSchema }),
  LMSController.launch
);

// Organization LMS Management Router: /api/v1/organizations/:organizationId/lms
export const organizationLMSRoutes = Router({ mergeParams: true });
organizationLMSRoutes.use(requireAuth);
organizationLMSRoutes.use(resolveTenantContext);

organizationLMSRoutes.get("/platforms", requirePermission("settings:view"), LMSController.listPlatforms);

organizationLMSRoutes.get("/connections", requirePermission("settings:view"), LMSController.listConnections);
organizationLMSRoutes.post(
  "/connections",
  requirePermission("settings:edit"),
  requireFeature("lti13"),
  validateRequest({ body: createLMSConnectionSchema }),
  LMSController.createConnection
);
organizationLMSRoutes.get("/connections/:connectionId", requirePermission("settings:view"), LMSController.getConnectionById);
organizationLMSRoutes.put(
  "/connections/:connectionId",
  requirePermission("settings:edit"),
  validateRequest({ body: updateLMSConnectionSchema }),
  LMSController.updateConnection
);
organizationLMSRoutes.delete("/connections/:connectionId", requirePermission("settings:edit"), LMSController.deleteConnection);
organizationLMSRoutes.post("/connections/:connectionId/test", requirePermission("settings:edit"), LMSController.testConnection);

organizationLMSRoutes.post(
  "/deployments",
  requirePermission("content:publish"),
  validateRequest({ body: createLMSDeploymentSchema }),
  LMSController.createDeployment
);
organizationLMSRoutes.get("/deployments", requirePermission("content:view"), LMSController.listDeployments);

organizationLMSRoutes.post(
  "/grade-push",
  requirePermission("content:edit"),
  validateRequest({ body: lmsGradePushSchema }),
  LMSController.pushGrade
);

organizationLMSRoutes.get("/activity-logs", requirePermission("settings:view"), LMSController.getActivityLogs);

// Generic Frontend Integration Router: /api/v1/integrations
export const genericIntegrationRoutes = Router();
genericIntegrationRoutes.get("/", LMSController.getIntegrations);
genericIntegrationRoutes.get("/sync-history", LMSController.getSyncHistory);
