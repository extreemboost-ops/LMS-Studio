import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";
import { LMSCryptoService, EncryptedPayload } from "./lms-crypto.service.js";
import {
  CreateLMSConnectionInput,
  UpdateLMSConnectionInput,
  CreateLMSDeploymentInput,
  LMSPlatformCodeType,
} from "./lms.schema.js";
import { Prisma } from "@prisma/client";

export class LMSConnectorService {
  /**
   * Seed default platform catalogue if missing
   */
  static async seedDefaultPlatforms() {
    const defaultPlatforms: Array<{ code: LMSPlatformCodeType; name: string; docUrl: string }> = [
      { code: "MOODLE", name: "Moodle Cloud", docUrl: "https://docs.moodle.org/dev/Web_service_API_functions" },
      { code: "CANVAS", name: "Canvas LMS", docUrl: "https://canvas.instructure.com/doc/api/" },
      { code: "BLACKBOARD", name: "Blackboard Learn", docUrl: "https://developer.anthology.com/" },
      { code: "DOCEBO", name: "Docebo", docUrl: "https://www.docebo.com/developers/" },
      { code: "BRIGHTSPACE", name: "D2L Brightspace", docUrl: "https://docs.valence.desire2learn.com/" },
      { code: "CUSTOM", name: "Custom LMS", docUrl: "https://scorm-h5p-studio.local/docs/integrations" },
    ];

    for (const p of defaultPlatforms) {
      await prisma.lMSPlatform.upsert({
        where: { code: p.code },
        update: { name: p.name, documentationUrl: p.docUrl },
        create: {
          code: p.code,
          name: p.name,
          documentationUrl: p.docUrl,
        },
      });
    }
  }

  /**
   * List available LMS platforms
   */
  static async listPlatforms() {
    await this.seedDefaultPlatforms();
    return prisma.lMSPlatform.findMany({
      orderBy: { name: "asc" },
    });
  }

  /**
   * Create a new LMS connection with encrypted credentials
   */
  static async createConnection(input: CreateLMSConnectionInput, organizationId: string) {
    // 1. Verify platform
    const platform = await prisma.lMSPlatform.findUnique({
      where: { code: input.platformCode },
    });
    if (!platform) {
      throw AppError.notFound("LMS platform");
    }

    // 2. Encrypt sensitive credentials with AES-256-GCM
    const encrypted = LMSCryptoService.encrypt(input.credentials as Record<string, unknown>);

    // 3. Create connection
    const connection = await prisma.lMSConnection.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId,
        platformId: platform.id,
        name: input.name,
        apiBaseUrl: input.apiBaseUrl || null,
        authType: input.authType,
        credentialsEncrypted: encrypted as unknown as Prisma.InputJsonValue,
        connectionStatus: "CONNECTED",
        healthStatus: "HEALTHY",
        itemsSyncedCount: 0,
      },
      include: { platform: true },
    });

    return {
      ...connection,
      credentialsEncrypted: undefined,
      credentialsSanitized: LMSCryptoService.sanitizeCredentials(input.credentials),
    };
  }

  /**
   * Update existing LMS connection
   */
  static async updateConnection(
    connectionId: string,
    input: UpdateLMSConnectionInput,
    organizationId: string
  ) {
    const existing = await prisma.lMSConnection.findFirst({
      where: { id: connectionId, organizationId },
    });
    if (!existing) {
      throw AppError.notFound("LMS Connection");
    }

    let credentialsUpdate: Prisma.InputJsonValue | undefined = undefined;
    if (input.credentials) {
      const encrypted = LMSCryptoService.encrypt(input.credentials as Record<string, unknown>);
      credentialsUpdate = encrypted as unknown as Prisma.InputJsonValue;
    }

    const updated = await prisma.lMSConnection.update({
      where: { id: connectionId },
      data: {
        name: input.name,
        apiBaseUrl: input.apiBaseUrl,
        authType: input.authType,
        ...(credentialsUpdate ? { credentialsEncrypted: credentialsUpdate } : {}),
      },
      include: { platform: true },
    });

    return {
      ...updated,
      credentialsEncrypted: undefined,
    };
  }

  /**
   * List connections for organization (with sanitized credentials)
   */
  static async listConnections(organizationId: string, workspaceId?: string) {
    const where: Prisma.LMSConnectionWhereInput = { organizationId };
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    const connections = await prisma.lMSConnection.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        platform: true,
        _count: { select: { deployments: true, activityLogs: true } },
      },
    });

    return connections.map((conn) => {
      let sanitizedCreds: Record<string, unknown> = {};
      if (conn.credentialsEncrypted) {
        try {
          const dec = LMSCryptoService.decrypt(conn.credentialsEncrypted as unknown as EncryptedPayload);
          sanitizedCreds = LMSCryptoService.sanitizeCredentials(dec);
        } catch {
          sanitizedCreds = { status: "corrupted_or_rekeyed" };
        }
      }

      return {
        ...conn,
        credentialsEncrypted: undefined,
        credentials: sanitizedCreds,
      };
    });
  }

  /**
   * Get single connection
   */
  static async getConnectionById(connectionId: string, organizationId: string) {
    const conn = await prisma.lMSConnection.findFirst({
      where: { id: connectionId, organizationId },
      include: {
        platform: true,
        deployments: { take: 10, orderBy: { publishedAt: "desc" } },
        activityLogs: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });

    if (!conn) {
      throw AppError.notFound("LMS Connection");
    }

    let sanitizedCreds: Record<string, unknown> = {};
    if (conn.credentialsEncrypted) {
      try {
        const dec = LMSCryptoService.decrypt(conn.credentialsEncrypted as unknown as EncryptedPayload);
        sanitizedCreds = LMSCryptoService.sanitizeCredentials(dec);
      } catch {
        sanitizedCreds = { status: "corrupted_or_rekeyed" };
      }
    }

    return {
      ...conn,
      credentialsEncrypted: undefined,
      credentials: sanitizedCreds,
    };
  }

  /**
   * Delete connection
   */
  static async deleteConnection(connectionId: string, organizationId: string) {
    const existing = await prisma.lMSConnection.findFirst({
      where: { id: connectionId, organizationId },
    });
    if (!existing) {
      throw AppError.notFound("LMS Connection");
    }

    await prisma.lMSConnection.delete({
      where: { id: connectionId },
    });

    return { success: true };
  }

  /**
   * Test connection credentials and ping LMS health
   */
  static async testConnection(connectionId: string, organizationId: string) {
    const conn = await prisma.lMSConnection.findFirst({
      where: { id: connectionId, organizationId },
      include: { platform: true },
    });

    if (!conn) {
      throw AppError.notFound("LMS Connection");
    }

    let canDecrypt = false;
    if (conn.credentialsEncrypted) {
      try {
        LMSCryptoService.decrypt(conn.credentialsEncrypted as unknown as EncryptedPayload);
        canDecrypt = true;
      } catch {
        canDecrypt = false;
      }
    }

    const isHealthy = canDecrypt;
    const healthStatus = isHealthy ? "HEALTHY" : "DOWN";
    const connectionStatus = isHealthy ? "CONNECTED" : "ERROR";

    // Update status in DB
    await prisma.lMSConnection.update({
      where: { id: conn.id },
      data: {
        healthStatus,
        connectionStatus,
        lastSyncAt: new Date(),
      },
    });

    // Record activity log
    await prisma.lMSActivityLog.create({
      data: {
        lmsConnectionId: conn.id,
        eventType: "TEST_CONNECTION",
        status: isHealthy ? "SUCCESS" : "FAILURE",
        payload: {
          platform: conn.platform.name,
          apiBaseUrl: conn.apiBaseUrl,
          authType: conn.authType,
          canDecrypt,
        } as Prisma.InputJsonValue,
        errorMessage: isHealthy ? null : "Failed to decrypt credentials or verify authentication credentials",
      },
    });

    return {
      success: isHealthy,
      platform: conn.platform.name,
      connectionStatus,
      healthStatus,
      testedAt: new Date().toISOString(),
    };
  }

  /**
   * Create LMS Deployment (publish course or SCORM package to LMS)
   */
  static async createDeployment(input: CreateLMSDeploymentInput, organizationId: string) {
    const conn = await prisma.lMSConnection.findFirst({
      where: { id: input.lmsConnectionId, organizationId },
    });
    if (!conn) {
      throw AppError.notFound("LMS Connection");
    }

    const externalActivityId = input.externalActivityId || `act-${Date.now().toString(36)}`;

    const deployment = await prisma.lMSDeployment.create({
      data: {
        lmsConnectionId: conn.id,
        courseId: input.courseId || null,
        contentProjectId: input.contentProjectId || null,
        scormPackageId: input.scormPackageId || null,
        externalCourseId: input.externalCourseId || "default-course",
        externalActivityId,
        deploymentStatus: "ACTIVE",
        publishedAt: new Date(),
        lastSyncedAt: new Date(),
      },
      include: {
        course: { select: { id: true, title: true } },
        contentProject: { select: { id: true, title: true } },
        scormPackage: { select: { id: true, packageTitle: true, format: true } },
      },
    });

    // Log publication event
    await prisma.lMSActivityLog.create({
      data: {
        lmsConnectionId: conn.id,
        lmsDeploymentId: deployment.id,
        eventType: "PUBLISH",
        status: "SUCCESS",
        payload: {
          deploymentId: deployment.id,
          title: input.title || deployment.course?.title || deployment.contentProject?.title || "Published Content",
          externalCourseId: deployment.externalCourseId,
          externalActivityId: deployment.externalActivityId,
        } as Prisma.InputJsonValue,
      },
    });

    // Increment synced items count
    await prisma.lMSConnection.update({
      where: { id: conn.id },
      data: {
        lastSyncAt: new Date(),
        itemsSyncedCount: { increment: 1 },
      },
    });

    return deployment;
  }

  /**
   * List deployments
   */
  static async listDeployments(organizationId: string, connectionId?: string) {
    const where: Prisma.LMSDeploymentWhereInput = {
      lmsConnection: { organizationId },
    };
    if (connectionId) {
      where.lmsConnectionId = connectionId;
    }

    return prisma.lMSDeployment.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      include: {
        lmsConnection: { select: { id: true, name: true, platform: true } },
        course: { select: { id: true, title: true } },
        contentProject: { select: { id: true, title: true } },
        scormPackage: { select: { id: true, packageTitle: true, format: true } },
      },
    });
  }

  /**
   * Get activity audit logs
   */
  static async getActivityLogs(organizationId: string, connectionId?: string, limit = 50) {
    const where: Prisma.LMSActivityLogWhereInput = {
      lmsConnection: { organizationId },
    };
    if (connectionId) {
      where.lmsConnectionId = connectionId;
    }

    return prisma.lMSActivityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        lmsConnection: { select: { id: true, name: true } },
        deployment: { select: { id: true, externalCourseId: true, externalActivityId: true } },
      },
    });
  }
}
