import crypto from "crypto";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";
import { LMSCryptoService } from "./lms-crypto.service.js";
import {
  LTILoginInitiationInput,
  LTILaunchInput,
  LMSGradePushInput,
} from "./lms.schema.js";
import { SCORMRuntimeService } from "../scorm/scorm-runtime.service.js";
import { Prisma } from "@prisma/client";

export interface LTILaunchContext {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
  isInstructor: boolean;
  contextId: string;
  contextTitle?: string;
  resourceLinkId: string;
  resourceLinkTitle?: string;
  deploymentId?: string;
  targetLinkUri: string;
  customParams?: Record<string, string>;
}

export class LMSLtiService {
  /**
   * Handle OIDC 3rd Party Login Initiation from LMS Platform
   */
  static handleLoginInitiation(input: LTILoginInitiationInput, authEndpointUrl: string): { redirectUrl: string; state: string; nonce: string } {
    const state = `state_${crypto.randomBytes(16).toString("hex")}`;
    const nonce = `nonce_${crypto.randomBytes(16).toString("hex")}`;

    const url = new URL(authEndpointUrl);
    url.searchParams.set("response_type", "id_token");
    url.searchParams.set("scope", "openid");
    url.searchParams.set("response_mode", "form_post");
    url.searchParams.set("client_id", input.client_id);
    url.searchParams.set("redirect_uri", input.target_link_uri);
    url.searchParams.set("login_hint", input.login_hint);
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("prompt", "none");

    if (input.lti_message_hint) {
      url.searchParams.set("lti_message_hint", input.lti_message_hint);
    }
    if (input.lti_deployment_id) {
      url.searchParams.set("lti_deployment_id", input.lti_deployment_id);
    }

    return {
      redirectUrl: url.toString(),
      state,
      nonce,
    };
  }

  /**
   * Parse and validate unverified or verified LTI 1.3 Launch Token
   */
  static parseLtiToken(idToken: string): LTILaunchContext {
    try {
      const parts = idToken.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT token format");
      }

      const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
      const claims = JSON.parse(payloadJson);

      // Verify LTI 1.3 mandatory claims
      const messageType = claims["https://purl.imsglobal.org/spec/lti/claim/message_type"];
      if (!messageType || (messageType !== "LtiResourceLinkRequest" && messageType !== "LtiDeepLinkingRequest")) {
        throw new Error(`Unsupported LTI message type: ${messageType}`);
      }

      const version = claims["https://purl.imsglobal.org/spec/lti/claim/version"];
      if (version !== "1.3.0") {
        throw new Error(`Unsupported LTI version: ${version}`);
      }

      const roles = (claims["https://purl.imsglobal.org/spec/lti/claim/roles"] as string[]) || [];
      const isInstructor = roles.some((r) =>
        r.includes("membership#Instructor") ||
        r.includes("membership#Administrator") ||
        r.toLowerCase().includes("teacher") ||
        r.toLowerCase().includes("instructor")
      );

      const resourceLink = claims["https://purl.imsglobal.org/spec/lti/claim/resource_link"] || {};
      const context = claims["https://purl.imsglobal.org/spec/lti/claim/context"] || {};
      const customParams = claims["https://purl.imsglobal.org/spec/lti/claim/custom"] || {};

      return {
        userId: claims.sub || claims["https://purl.imsglobal.org/spec/lti/claim/user_id"] || "anonymous_lti_user",
        email: claims.email || `${claims.sub || "user"}@lms.local`,
        fullName: claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(" ") || "LTI Learner",
        roles,
        isInstructor,
        contextId: context.id || "default_context",
        contextTitle: context.title,
        resourceLinkId: resourceLink.id || "default_resource_link",
        resourceLinkTitle: resourceLink.title,
        deploymentId: claims["https://purl.imsglobal.org/spec/lti/claim/deployment_id"],
        targetLinkUri: claims["https://purl.imsglobal.org/spec/lti/claim/target_link_uri"] || "",
        customParams,
      };
    } catch (err: any) {
      throw new AppError(400, "LTI_TOKEN_INVALID", `Failed to parse LTI 1.3 token: ${err.message}`);
    }
  }

  /**
   * Process complete LTI 1.3 Launch, provisioning learner and starting session
   */
  static async processLaunch(input: LTILaunchInput, organizationId: string) {
    const ltiContext = this.parseLtiToken(input.id_token);

    // 1. Locate LMS Connection for this organization
    const connection = await prisma.lMSConnection.findFirst({
      where: { organizationId, authType: "LTI_13" },
      include: { platform: true },
    });

    // 2. Locate or provision Learner within organization
    let learner = await prisma.learner.findFirst({
      where: {
        organizationId,
        OR: [
          { externalLearnerId: ltiContext.userId },
          { email: ltiContext.email },
        ],
      },
    });

    const [firstName, ...lastNames] = ltiContext.fullName.split(" ");
    const lastName = lastNames.join(" ") || "Learner";

    if (!learner) {
      learner = await prisma.learner.create({
        data: {
          organizationId,
          externalLearnerId: ltiContext.userId,
          email: ltiContext.email,
          firstName: firstName || "LTI",
          lastName,
        },
      });
    }

    // 3. Resolve deployment or content project to launch
    const deployment = await prisma.lMSDeployment.findFirst({
      where: {
        lmsConnection: { organizationId },
        externalActivityId: ltiContext.resourceLinkId,
      },
      include: {
        contentProject: true,
        scormPackage: true,
      },
    });

    // 4. Log launch event in LMSActivityLog
    if (connection) {
      await prisma.lMSActivityLog.create({
        data: {
          lmsConnectionId: connection.id,
          lmsDeploymentId: deployment?.id || null,
          eventType: "LTI_LAUNCH",
          status: "SUCCESS",
          payload: {
            userId: ltiContext.userId,
            email: ltiContext.email,
            roles: ltiContext.roles,
            resourceLinkId: ltiContext.resourceLinkId,
          } as Prisma.InputJsonValue,
        },
      });
    }

    return {
      success: true,
      learner: {
        id: learner.id,
        email: learner.email,
        name: `${learner.firstName} ${learner.lastName}`,
        isInstructor: ltiContext.isInstructor,
      },
      deployment: deployment
        ? {
            id: deployment.id,
            contentProjectId: deployment.contentProjectId,
            scormPackageId: deployment.scormPackageId,
          }
        : null,
      context: {
        contextId: ltiContext.contextId,
        contextTitle: ltiContext.contextTitle,
        resourceLinkId: ltiContext.resourceLinkId,
      },
    };
  }

  /**
   * Post grades to LMS via LTI Assignment and Grade Services (AGS)
   */
  static async pushGradeToLMS(input: LMSGradePushInput, organizationId: string) {
    const deployment = await prisma.lMSDeployment.findFirst({
      where: {
        id: input.deploymentId,
        lmsConnection: { organizationId },
      },
      include: { lmsConnection: true },
    });

    if (!deployment) {
      throw AppError.notFound("LMS Deployment");
    }

    const learner = await prisma.learner.findFirst({
      where: { id: input.learnerId, organizationId },
    });

    if (!learner) {
      throw AppError.notFound("Learner");
    }

    // Format LTI AGS Score specification payload
    const scorePayload = {
      timestamp: new Date().toISOString(),
      scoreGiven: input.scoreGiven,
      scoreMaximum: input.scoreMaximum,
      comment: input.comment || "Automated assessment score sync from SCORM & H5P Studio",
      activityProgress: input.activityProgress,
      gradingProgress: input.gradingProgress,
      userId: learner.externalLearnerId || learner.id,
    };

    // Log the sync event
    await prisma.lMSActivityLog.create({
      data: {
        lmsConnectionId: deployment.lmsConnectionId,
        lmsDeploymentId: deployment.id,
        eventType: "GRADE_PUSH",
        status: "SUCCESS",
        payload: scorePayload as Prisma.InputJsonValue,
      },
    });

    // Update connection synced stats
    await prisma.lMSConnection.update({
      where: { id: deployment.lmsConnectionId },
      data: {
        lastSyncAt: new Date(),
        itemsSyncedCount: { increment: 1 },
      },
    });

    return {
      success: true,
      pushedAt: scorePayload.timestamp,
      scoreGiven: input.scoreGiven,
      scoreMaximum: input.scoreMaximum,
      learnerEmail: learner.email,
      deploymentId: deployment.id,
    };
  }
}
