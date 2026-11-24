import type { Request, Response, NextFunction } from "express";
import { AnalyticsService } from "./analytics.service.js";
import { XAPIEngineService } from "./xapi-engine.service.js";
import { CaliperEngineService } from "./caliper-engine.service.js";
import { AuditComplianceService } from "./audit-compliance.service.js";
import { TelemetryService } from "./telemetry.service.js";
import { ResponseHelper } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/appError.js";

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/dashboard
   */
  public static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId || "00000000-0000-4000-a000-000000000001";
      const interval = req.query.interval === "Monthly" ? "Monthly" : "Weekly";
      const metrics = await AnalyticsService.getDashboardMetrics(organizationId, interval);
      ResponseHelper.sendSuccess(res, metrics, 200, "Dashboard metrics retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/analytics/export/csv
   */
  public static async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId || "00000000-0000-4000-a000-000000000001";
      const csv = await AnalyticsService.generateCsvReport(organizationId);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="learning-analytics-report.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/analytics/audit-logs
   */
  public static async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId || "00000000-0000-4000-a000-000000000001";
      const { action, entityType, limit, offset } = req.query;

      const result = await AuditComplianceService.getAuditLogs({
        organizationId,
        action: typeof action === "string" ? action : undefined,
        entityType: typeof entityType === "string" ? entityType : undefined,
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0,
      });

      ResponseHelper.sendSuccess(res, result, 200, "Audit logs retrieved");
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/analytics/lms-sync-logs
   */
  public static async getLmsSyncLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lmsConnectionId, eventType, status, limit } = req.query;

      const logs = await AuditComplianceService.getLmsSyncLogs({
        lmsConnectionId: typeof lmsConnectionId === "string" ? lmsConnectionId : undefined,
        eventType: typeof eventType === "string" ? eventType : undefined,
        status: typeof status === "string" ? status : undefined,
        limit: limit ? Number(limit) : 50,
      });

      ResponseHelper.sendSuccess(res, logs, 200, "LMS activity logs retrieved");
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/analytics/xapi/statements
   */
  public static async recordXAPIStatement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { actor, verb, object, result, context } = req.body;
      if (!actor || !verb || !object) {
        throw AppError.badRequest("xAPI statement requires actor, verb, and object");
      }

      const statement = XAPIEngineService.recordStatement({
        actor,
        verb,
        object,
        result,
        context,
      });

      ResponseHelper.sendSuccess(res, statement, 201, "xAPI statement recorded");
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/analytics/xapi/statements
   */
  public static async queryXAPIStatements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { actorEmail, verbId, activityId, limit } = req.query;

      const statements = XAPIEngineService.getStatements({
        actorEmail: typeof actorEmail === "string" ? actorEmail : undefined,
        verbId: typeof verbId === "string" ? verbId : undefined,
        activityId: typeof activityId === "string" ? activityId : undefined,
        limit: limit ? Number(limit) : 50,
      });

      ResponseHelper.sendSuccess(res, statements, 200, "xAPI statements retrieved");
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/analytics/caliper/events
   */
  public static async recordCaliperEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, actor, action, object, generated, sessionId } = req.body;
      if (!type || !actor || !action || !object) {
        throw AppError.badRequest("Caliper event requires type, actor, action, and object");
      }

      const event = CaliperEngineService.recordEvent({
        type,
        actor,
        action,
        object,
        generated,
        sessionId,
      });

      ResponseHelper.sendSuccess(res, event, 201, "Caliper event recorded");
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/analytics/caliper/events
   */
  public static async queryCaliperEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { actorId, eventType, action, limit } = req.query;

      const events = CaliperEngineService.getEvents({
        actorId: typeof actorId === "string" ? actorId : undefined,
        eventType: typeof eventType === "string" ? (eventType as any) : undefined,
        action: typeof action === "string" ? (action as any) : undefined,
        limit: limit ? Number(limit) : 50,
      });

      ResponseHelper.sendSuccess(res, events, 200, "Caliper events retrieved");
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/analytics/telemetry
   */
  public static async getTelemetry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId || "00000000-0000-4000-a000-000000000001";
      const telemetry = await TelemetryService.getSystemTelemetry(organizationId);
      ResponseHelper.sendSuccess(res, telemetry, 200, "System telemetry retrieved");
    } catch (err) {
      next(err);
    }
  }
}
