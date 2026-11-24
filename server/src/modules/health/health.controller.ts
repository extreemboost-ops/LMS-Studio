import type { Request, Response, NextFunction } from "express";
import { checkDatabaseHealth } from "../../database/prisma.js";
import { ResponseHelper } from "../../utils/apiResponse.js";
import { env } from "../../config/env.js";
import type { SystemHealthResult, ReadinessResult } from "../../types/api.types.js";

export class HealthController {
  /**
   * Overall system health and resource consumption
   */
  static async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const memory = process.memoryUsage();
      const payload: SystemHealthResult = {
        status: "OK",
        version: "1.0.0",
        uptimeSeconds: Math.floor(process.uptime()),
        environment: env.NODE_ENV,
        memoryUsage: {
          heapUsedMB: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMB: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
          rssMB: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        },
        timestamp: new Date().toISOString(),
      };

      ResponseHelper.sendSuccess(res, payload, 200, "System service is operational");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Real database connectivity diagnostic
   */
  static async getDatabaseHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dbHealth = await checkDatabaseHealth();
      const statusCode = dbHealth.status === "UP" ? 200 : 503;
      const message =
        dbHealth.status === "UP"
          ? "Database connection active and responsive"
          : "Database connection failed or unreachable";

      ResponseHelper.sendSuccess(res, dbHealth, statusCode, message);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Orchestrator readiness check (e.g., Kubernetes / Docker healthcheck)
   */
  static async getReadiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dbHealth = await checkDatabaseHealth();
      const isReady = dbHealth.status === "UP";

      const readiness: ReadinessResult = {
        ready: isReady,
        checks: {
          database: dbHealth.status === "UP" ? "UP" : "DOWN",
          configuration: "UP",
        },
        timestamp: new Date().toISOString(),
      };

      const statusCode = isReady ? 200 : 503;
      const message = isReady
        ? "Service is ready to handle traffic"
        : "Service is not ready: database dependency is down";

      ResponseHelper.sendSuccess(res, readiness, statusCode, message);
    } catch (err) {
      next(err);
    }
  }
}
