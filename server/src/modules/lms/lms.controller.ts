import type { Request, Response, NextFunction } from "express";
import { LMSConnectorService } from "./lms-connector.service.js";
import { LMSLtiService } from "./lms-lti.service.js";
import { LMSCryptoService } from "./lms-crypto.service.js";
import {
  CreateLMSConnectionInput,
  UpdateLMSConnectionInput,
  CreateLMSDeploymentInput,
  LMSGradePushInput,
  LTILoginInitiationInput,
  LTILaunchInput,
} from "./lms.schema.js";
import { AppError } from "../../utils/appError.js";
import { ResponseHelper } from "../../utils/apiResponse.js";

function getSingleParam(param: string | string[] | undefined): string | undefined {
  if (!param) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

export class LMSController {
  /**
   * List available LMS platforms
   */
  static async listPlatforms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const platforms = await LMSConnectorService.listPlatforms();
      ResponseHelper.sendSuccess(res, platforms, 200, "LMS platforms retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * List connections for organization
   */
  static async listConnections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      if (!organizationId) throw AppError.badRequest("Organization ID is required");

      const workspaceId = typeof req.query.workspaceId === "string" ? req.query.workspaceId : undefined;
      const connections = await LMSConnectorService.listConnections(organizationId, workspaceId);

      ResponseHelper.sendSuccess(res, connections, 200, "LMS connections retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single connection by ID
   */
  static async getConnectionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      const connectionId = getSingleParam(req.params.connectionId);
      if (!organizationId || !connectionId) {
        throw AppError.badRequest("Organization ID and Connection ID are required");
      }

      const connection = await LMSConnectorService.getConnectionById(connectionId, organizationId);
      ResponseHelper.sendSuccess(res, connection, 200, "LMS connection retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create LMS connection
   */
  static async createConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      if (!organizationId) throw AppError.badRequest("Organization ID is required");

      const input = req.body as CreateLMSConnectionInput;
      const connection = await LMSConnectorService.createConnection(input, organizationId);

      ResponseHelper.sendSuccess(res, connection, 201, "LMS connection created successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update LMS connection
   */
  static async updateConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      const connectionId = getSingleParam(req.params.connectionId);
      if (!organizationId || !connectionId) {
        throw AppError.badRequest("Organization ID and Connection ID are required");
      }

      const input = req.body as UpdateLMSConnectionInput;
      const updated = await LMSConnectorService.updateConnection(connectionId, input, organizationId);

      ResponseHelper.sendSuccess(res, updated, 200, "LMS connection updated successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete connection
   */
  static async deleteConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      const connectionId = getSingleParam(req.params.connectionId);
      if (!organizationId || !connectionId) {
        throw AppError.badRequest("Organization ID and Connection ID are required");
      }

      const result = await LMSConnectorService.deleteConnection(connectionId, organizationId);
      ResponseHelper.sendSuccess(res, result, 200, "LMS connection deleted successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Test connection credentials and ping LMS health
   */
  static async testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      const connectionId = getSingleParam(req.params.connectionId);
      if (!organizationId || !connectionId) {
        throw AppError.badRequest("Organization ID and Connection ID are required");
      }

      const testResult = await LMSConnectorService.testConnection(connectionId, organizationId);
      ResponseHelper.sendSuccess(res, testResult, 200, "LMS connection test completed");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create LMS deployment (publish content to LMS)
   */
  static async createDeployment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      if (!organizationId) throw AppError.badRequest("Organization ID is required");

      const input = req.body as CreateLMSDeploymentInput;
      const deployment = await LMSConnectorService.createDeployment(input, organizationId);

      ResponseHelper.sendSuccess(res, deployment, 201, "Content deployed to LMS successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * List deployments
   */
  static async listDeployments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      if (!organizationId) throw AppError.badRequest("Organization ID is required");

      const connectionId = typeof req.query.connectionId === "string" ? req.query.connectionId : undefined;
      const deployments = await LMSConnectorService.listDeployments(organizationId, connectionId);

      ResponseHelper.sendSuccess(res, deployments, 200, "LMS deployments retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Grade Push to LMS Gradebook
   */
  static async pushGrade(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      if (!organizationId) throw AppError.badRequest("Organization ID is required");

      const input = req.body as LMSGradePushInput;
      const result = await LMSLtiService.pushGradeToLMS(input, organizationId);

      ResponseHelper.sendSuccess(res, result, 200, "Grade pushed to LMS gradebook successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get activity logs
   */
  static async getActivityLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = getSingleParam(req.params.organizationId);
      if (!organizationId) throw AppError.badRequest("Organization ID is required");

      const connectionId = typeof req.query.connectionId === "string" ? req.query.connectionId : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;

      const logs = await LMSConnectorService.getActivityLogs(organizationId, connectionId, limit);
      ResponseHelper.sendSuccess(res, logs, 200, "LMS activity logs retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public LTI 1.3 JWKS
   */
  static async getPublicJWKS(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jwks = LMSCryptoService.getPublicJWKS();
      res.setHeader("Content-Type", "application/json");
      res.status(200).json(jwks);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public LTI 1.3 OIDC Login Initiation
   */
  static async loginInitiation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = (req.method === "POST" ? req.body : req.query) as unknown as LTILoginInitiationInput;
      const authEndpoint = input.iss ? `${input.iss}/api/lti/authorize_redirect` : "https://canvas.instructure.com/api/lti/authorize_redirect";

      const initResult = LMSLtiService.handleLoginInitiation(input, authEndpoint);
      res.redirect(302, initResult.redirectUrl);
      return;
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public LTI 1.3 Launch Handler
   */
  static async launch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as LTILaunchInput;
      const organizationId = typeof req.query.orgId === "string" ? req.query.orgId : "default-org";

      const launchResult = await LMSLtiService.processLaunch(input, organizationId);
      ResponseHelper.sendSuccess(res, launchResult, 200, "LTI 1.3 launch processed successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Generic /integrations endpoint for frontend UI
   */
  static async getIntegrations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) {
        // Return default UI integration formats
        res.json({
          success: true,
          data: [
            { id: "moodle-1", name: "Moodle Cloud", code: "moodle", logo: "m", type: "Native REST Plugin", status: "Connected", lastSync: "18 min ago", itemsSynced: 24, health: "Healthy" },
            { id: "canvas-1", name: "Canvas LMS", code: "canvas", logo: "C", type: "Native integration", status: "Disconnected" },
            { id: "blackboard-1", name: "Blackboard Learn", code: "blackboard", logo: "B", type: "LTI 1.3", status: "Disconnected" },
            { id: "docebo-1", name: "Docebo", code: "docebo", logo: "D", type: "SCORM Cloud", status: "Disconnected" },
            { id: "custom-1", name: "Custom LMS", code: "custom", logo: "<>", type: "API connection", status: "Disconnected" },
          ],
        });
        return;
      }

      const connections = await LMSConnectorService.listConnections(orgId);
      const integrations = connections.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.platform.code.toLowerCase(),
        logo: c.platform.name.charAt(0),
        type: c.authType === "LTI_13" ? "LTI 1.3" : c.authType === "OAUTH2" ? "Native REST Plugin" : "API connection",
        status: c.connectionStatus === "CONNECTED" ? "Connected" : "Disconnected",
        lastSync: c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleTimeString() : undefined,
        itemsSynced: c.itemsSyncedCount,
        health: c.healthStatus === "HEALTHY" ? "Healthy" : c.healthStatus === "WARNING" ? "Degraded" : "Failed",
      }));

      res.json({ success: true, data: integrations });
      return;
    } catch (err) {
      next(err);
    }
  }

  /**
   * Generic /integrations/sync-history for frontend UI
   */
  static async getSyncHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) {
        res.json({
          success: true,
          data: [
            { id: "sync-1", contentTitle: "Workplace Safety Essentials", action: "Published to Moodle", time: "18 min ago", success: true },
            { id: "sync-2", contentTitle: "Data Privacy Fundamentals", action: "Sync completed", time: "Yesterday", success: true },
            { id: "sync-3", contentTitle: "Customer Success Playbook", action: "Content updated", time: "Apr 24", success: true },
            { id: "sync-4", contentTitle: "Product Knowledge Check", action: "Sync failed", time: "Apr 22", success: false },
          ],
        });
        return;
      }

      const logs = await LMSConnectorService.getActivityLogs(orgId, undefined, 20);
      const syncHistory = logs.map((log) => ({
        id: log.id,
        contentTitle: (log.payload as any)?.title || "Course Material",
        action: log.eventType === "PUBLISH" ? "Published to LMS" : log.eventType === "GRADE_PUSH" ? "Grade synced" : "Sync completed",
        time: new Date(log.createdAt).toLocaleTimeString(),
        success: log.status === "SUCCESS",
      }));

      res.json({ success: true, data: syncHistory });
      return;
    } catch (err) {
      next(err);
    }
  }
}
