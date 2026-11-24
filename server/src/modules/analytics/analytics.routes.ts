import { Router } from "express";
import { AnalyticsController } from "./analytics.controller.js";
import { requireAuth } from "../../middlewares/auth.js";
import { resolveTenantContext } from "../../middlewares/tenantContext.js";
import { requirePermission } from "../../middlewares/rbac.js";

export const analyticsRoutes = Router();

// Public / Tokenized learning telemetry emitters (e.g. learner clients emitting xAPI/Caliper)
analyticsRoutes.post("/xapi/statements", AnalyticsController.recordXAPIStatement);
analyticsRoutes.get("/xapi/statements", AnalyticsController.queryXAPIStatements);
analyticsRoutes.post("/caliper/events", AnalyticsController.recordCaliperEvent);
analyticsRoutes.get("/caliper/events", AnalyticsController.queryCaliperEvents);

// Authenticated tenant analytics and reporting endpoints
analyticsRoutes.use(requireAuth);
analyticsRoutes.use(resolveTenantContext);

analyticsRoutes.get(
  "/dashboard",
  requirePermission("analytics:view"),
  AnalyticsController.getDashboard
);
analyticsRoutes.get(
  "/export/csv",
  requirePermission("analytics:view"),
  AnalyticsController.exportCsv
);
analyticsRoutes.get(
  "/audit-logs",
  requirePermission("organization:view"),
  AnalyticsController.getAuditLogs
);
analyticsRoutes.get(
  "/lms-sync-logs",
  requirePermission("analytics:view"),
  AnalyticsController.getLmsSyncLogs
);
analyticsRoutes.get(
  "/telemetry",
  requirePermission("organization:view"),
  AnalyticsController.getTelemetry
);
