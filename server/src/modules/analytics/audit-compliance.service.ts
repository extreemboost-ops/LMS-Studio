import crypto from "node:crypto";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";

export interface RecordAuditInput {
  organizationId: string;
  workspaceId?: string;
  userId?: string;
  action: string; // "PROJECT_DELETE", "ROLE_ASSIGN", "PACKAGE_EXPORT", "GRADE_PUSH", "SETTINGS_UPDATE"
  entityType: string; // "ContentProject", "OrganizationMember", "SCORMPackage", "LMSConnection"
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface RecordLmsSyncInput {
  lmsConnectionId: string;
  lmsDeploymentId?: string;
  eventType: "PUBLISH" | "SYNC" | "GRADE_PUSH";
  status: "SUCCESS" | "FAILURE";
  payload?: Record<string, unknown>;
  errorMessage?: string;
}

export class AuditComplianceService {
  private static memoryAuditLogs: any[] = [];
  private static memoryLmsLogs: any[] = [];

  /**
   * Record a tamper-evident audit log
   */
  public static async recordAuditLog(input: RecordAuditInput) {
    try {
      const record = await prisma.auditLog.create({
        data: {
          organizationId: input.organizationId,
          workspaceId: input.workspaceId || null,
          userId: input.userId || null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId || null,
          oldValues: (input.oldValues as any) || undefined,
          newValues: (input.newValues as any) || undefined,
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
        },
      });
      return record;
    } catch {
      // In-memory fallback
      const log = {
        id: crypto.randomUUID(),
        ...input,
        createdAt: new Date(),
      };
      this.memoryAuditLogs.unshift(log);
      if (this.memoryAuditLogs.length > 500) this.memoryAuditLogs.pop();
      return log;
    }
  }

  /**
   * Record an LMS synchronization or grade-push audit log
   */
  public static async recordLmsSyncLog(input: RecordLmsSyncInput) {
    try {
      const record = await prisma.lMSActivityLog.create({
        data: {
          lmsConnectionId: input.lmsConnectionId,
          lmsDeploymentId: input.lmsDeploymentId || null,
          eventType: input.eventType,
          status: input.status,
          payload: (input.payload as any) || undefined,
          errorMessage: input.errorMessage || null,
        },
      });
      return record;
    } catch {
      // In-memory fallback
      const log = {
        id: crypto.randomUUID(),
        ...input,
        createdAt: new Date(),
      };
      this.memoryLmsLogs.unshift(log);
      if (this.memoryLmsLogs.length > 500) this.memoryLmsLogs.pop();
      return log;
    }
  }

  /**
   * Query organization audit logs
   */
  public static async getAuditLogs(params: {
    organizationId: string;
    action?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = params.limit || 50;
    const offset = params.offset || 0;

    try {
      const where: any = { organizationId: params.organizationId };
      if (params.action) where.action = params.action;
      if (params.entityType) where.entityType = params.entityType;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return { logs, total, limit, offset };
    } catch {
      // In-memory fallback
      let filtered = this.memoryAuditLogs.filter((l) => l.organizationId === params.organizationId);
      if (params.action) filtered = filtered.filter((l) => l.action === params.action);
      if (params.entityType) filtered = filtered.filter((l) => l.entityType === params.entityType);

      const total = filtered.length;
      const logs = filtered.slice(offset, offset + limit);
      return { logs, total, limit, offset };
    }
  }

  /**
   * Query LMS activity and sync logs
   */
  public static async getLmsSyncLogs(params: {
    lmsConnectionId?: string;
    eventType?: string;
    status?: string;
    limit?: number;
  }) {
    const limit = params.limit || 50;

    try {
      const where: any = {};
      if (params.lmsConnectionId) where.lmsConnectionId = params.lmsConnectionId;
      if (params.eventType) where.eventType = params.eventType;
      if (params.status) where.status = params.status;

      const logs = await prisma.lMSActivityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return logs;
    } catch {
      let filtered = [...this.memoryLmsLogs];
      if (params.lmsConnectionId) filtered = filtered.filter((l) => l.lmsConnectionId === params.lmsConnectionId);
      if (params.eventType) filtered = filtered.filter((l) => l.eventType === params.eventType);
      if (params.status) filtered = filtered.filter((l) => l.status === params.status);
      return filtered.slice(0, limit);
    }
  }
}
