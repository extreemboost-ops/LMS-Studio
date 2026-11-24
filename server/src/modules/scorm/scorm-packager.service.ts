import crypto from "crypto";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";
import { CreateSCORMExportInput, SCORMStandardType } from "./scorm.schema.js";
import { Prisma } from "@prisma/client";

/**
 * SCORM XML and Manifest Packager Utility
 */
export class SCORMPackagerService {
  /**
   * Escape XML string values safely
   */
  static escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case "&":
          return "&amp;";
        case "'":
          return "&apos;";
        case '"':
          return "&quot;";
        default:
          return c;
      }
    });
  }

  /**
   * Generate imsmanifest.xml for SCORM 1.2
   */
  static generateScorm12Manifest(params: {
    manifestId: string;
    packageTitle: string;
    masteryScorePercent: number;
    launchFile: string;
    files: string[];
  }): string {
    const { manifestId, packageTitle, masteryScorePercent, launchFile, files } = params;
    const titleEscaped = this.escapeXml(packageTitle);
    const filesXml = files.map((f) => `      <file href="${this.escapeXml(f)}"/>`).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifestId}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p2 imsmd_rootv1p2p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p1p2 adlcp_rootv1p1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org_default">
    <organization identifier="org_default">
      <title>${titleEscaped}</title>
      <item identifier="item_1" identifierref="res_1">
        <title>${titleEscaped}</title>
        <adlcp:masteryscore>${masteryScorePercent}</adlcp:masteryscore>
        <adlcp:datafromlms></adlcp:datafromlms>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_1" type="webcontent" adlcp:scormtype="sco" href="${launchFile}">
${filesXml}
    </resource>
  </resources>
</manifest>`;
  }

  /**
   * Generate imsmanifest.xml for SCORM 2004 (3rd & 4th Edition)
   */
  static generateScorm2004Manifest(params: {
    manifestId: string;
    packageTitle: string;
    masteryScoreDecimal: number;
    standard: SCORMStandardType;
    launchFile: string;
    files: string[];
  }): string {
    const { manifestId, packageTitle, masteryScoreDecimal, standard, launchFile, files } = params;
    const titleEscaped = this.escapeXml(packageTitle);
    const edition = standard === "SCORM_2004_3RD_EDITION" ? "2004 3rd Edition" : "2004 4th Edition";
    const filesXml = files.map((f) => `      <file href="${this.escapeXml(f)}"/>`).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifestId}" version="1.0"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>${edition}</schemaversion>
  </metadata>
  <organizations default="org_default">
    <organization identifier="org_default">
      <title>${titleEscaped}</title>
      <item identifier="item_1" identifierref="res_1">
        <title>${titleEscaped}</title>
        <imsss:sequencing>
          <imsss:deliveryControls tracked="true" completionSetByContent="true" objectiveSetByContent="true"/>
          <imsss:objectives>
            <imsss:primaryObjective objectiveID="PRIMARY_OBJ" satisfiedByMeasure="true">
              <imsss:minNormalizedMeasure>${masteryScoreDecimal.toFixed(3)}</imsss:minNormalizedMeasure>
            </imsss:primaryObjective>
          </imsss:objectives>
        </imsss:sequencing>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_1" type="webcontent" adlcp:scormtype="sco" href="${launchFile}">
${filesXml}
    </resource>
  </resources>
</manifest>`;
  }

  /**
   * Generate the universal client-side SCORM API Wrapper script (scorm-bridge.js)
   */
  static generateScormClientBridge(standard: SCORMStandardType): string {
    const is12 = standard === "SCORM_12";
    return `/**
 * Universal SCORM Client Bridge Adapter
 * Standard: ${standard}
 */
(function(window) {
  'use strict';

  var isSCORM12 = ${is12};
  var apiHandle = null;
  var isInitialized = false;

  function findAPI(win) {
    var findAttempts = 0;
    var findAttemptLimit = 10;
    while (!win.API && !win.API_1484_11 && win.parent && win.parent !== win && findAttempts < findAttemptLimit) {
      findAttempts++;
      win = win.parent;
    }
    return isSCORM12 ? (win.API || null) : (win.API_1484_11 || null);
  }

  function getAPI() {
    if (apiHandle === null) {
      apiHandle = findAPI(window);
      if (!apiHandle && window.opener) {
        apiHandle = findAPI(window.opener);
      }
    }
    return apiHandle;
  }

  window.ScormBridge = {
    initialize: function() {
      var api = getAPI();
      if (!api) {
        console.warn('[ScormBridge] LMS API not found; running in standalone simulation mode.');
        isInitialized = true;
        return true;
      }
      var res = isSCORM12 ? api.LMSInitialize("") : api.Initialize("");
      isInitialized = (res === "true" || res === true);
      return isInitialized;
    },
    getValue: function(element) {
      var api = getAPI();
      if (!api) return "";
      return isSCORM12 ? api.LMSGetValue(element) : api.GetValue(element);
    },
    setValue: function(element, value) {
      var api = getAPI();
      if (!api) return true;
      var res = isSCORM12 ? api.LMSSetValue(element, value) : api.SetValue(element, value);
      return (res === "true" || res === true);
    },
    commit: function() {
      var api = getAPI();
      if (!api) return true;
      var res = isSCORM12 ? api.LMSCommit("") : api.Commit("");
      return (res === "true" || res === true);
    },
    terminate: function() {
      var api = getAPI();
      if (!api) return true;
      var res = isSCORM12 ? api.LMSFinish("") : api.Terminate("");
      isInitialized = false;
      return (res === "true" || res === true);
    }
  };
})(window);
`;
  }

  /**
   * Execute or simulate the complete SCORM export packaging process
   */
  static async exportPackage(
    projectId: string,
    organizationId: string,
    userId: string,
    input: CreateSCORMExportInput
  ) {
    // 1. Verify project
    const project = await prisma.contentProject.findFirst({
      where: { id: projectId, organizationId },
      include: {
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
        elements: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!project) {
      throw AppError.notFound("Content project");
    }

    // 2. Resolve content version
    let versionId = input.contentVersionId;
    if (!versionId) {
      if (project.versions.length > 0) {
        versionId = project.versions[0].id;
      } else {
        // Create an initial version snapshot if none exists
        const initialVersion = await prisma.contentVersion.create({
          data: {
            contentProjectId: project.id,
            versionNumber: 1,
            title: project.title,
            description: project.description,
            snapshotPayload: {
              title: project.title,
              description: project.description,
              elementsCount: project.elements.length,
            },
            createdById: userId,
          },
        });
        versionId = initialVersion.id;
      }
    }

    // 3. Generate package identifier and files list
    const manifestId = `MANIFEST-${project.id.slice(0, 8)}-${Date.now()}`;
    const launchFile = "index.html";
    const files = [
      launchFile,
      "scorm-bridge.js",
      "assets/css/player.css",
      "assets/js/engine.js",
      "data/content.json",
    ];

    // 4. Generate manifest XML
    let manifestXml = "";
    if (input.format === "SCORM_12") {
      manifestXml = this.generateScorm12Manifest({
        manifestId,
        packageTitle: input.packageTitle,
        masteryScorePercent: input.passingScorePercent,
        launchFile,
        files,
      });
    } else {
      manifestXml = this.generateScorm2004Manifest({
        manifestId,
        packageTitle: input.packageTitle,
        masteryScoreDecimal: input.masteryScoreDecimal,
        standard: input.format,
        launchFile,
        files,
      });
    }

    // 5. Build parsed manifest structures
    const organizationsJson = [
      {
        identifier: "org_default",
        title: input.packageTitle,
        items: [
          {
            identifier: "item_1",
            identifierref: "res_1",
            title: input.packageTitle,
          },
        ],
      },
    ];

    const resourcesJson = [
      {
        identifier: "res_1",
        type: "webcontent",
        scormType: "sco",
        href: launchFile,
        files,
      },
    ];

    const sequencingJson =
      input.format !== "SCORM_12"
        ? {
            deliveryControls: { tracked: true, completionSetByContent: true, objectiveSetByContent: true },
            minNormalizedMeasure: input.masteryScoreDecimal,
          }
        : null;

    // 6. Compute package checksum & storage key
    const packagePayload = `${manifestXml}\n${JSON.stringify(organizationsJson)}\n${JSON.stringify(resourcesJson)}`;
    const checksumSha256 = crypto.createHash("sha256").update(packagePayload).digest("hex");
    const storageKey = `organizations/${organizationId}/scorm/${manifestId}.zip`;
    const estimatedSizeBytes = BigInt(Buffer.byteLength(packagePayload, "utf-8") + 524288); // Content payload + base engine assets

    // 7. Transactional DB persistence
    const { scormPackage, exportJob } = await prisma.$transaction(async (tx) => {
      // Create SCORMPackage record
      const pkg = await tx.sCORMPackage.create({
        data: {
          organizationId,
          workspaceId: project.workspaceId,
          contentProjectId: project.id,
          contentVersionId: versionId!,
          format: input.format,
          packageTitle: input.packageTitle,
          versionString: input.versionString,
          manifestIdentifier: manifestId,
          storageKey,
          fileSizeBytes: estimatedSizeBytes,
          checksumSha256,
          launchFile,
          createdById: userId,
        },
      });

      // Create SCORMManifest record
      await tx.sCORMManifest.create({
        data: {
          scormPackageId: pkg.id,
          manifestXml,
          organizationsJson,
          resourcesJson,
          sequencingJson: sequencingJson ?? Prisma.JsonNull,
        },
      });

      // Create SCORMRuntimeConfiguration record
      await tx.sCORMRuntimeConfiguration.create({
        data: {
          scormPackageId: pkg.id,
          launchBehavior: input.launchBehavior,
          completionCriteria: input.completionCriteria,
          passingScorePercent: input.passingScorePercent,
          trackingMode: input.trackingMode,
          masteryScoreDecimal: new Prisma.Decimal(input.masteryScoreDecimal),
          timeLimitAction: input.timeLimitAction,
          maxTimeAllowedSeconds: input.maxTimeAllowedSeconds || null,
        },
      });

      // Create SCORMContentMapping records for SCOs
      await tx.sCORMContentMapping.create({
        data: {
          scormPackageId: pkg.id,
          scoIdentifier: "item_1",
          title: input.packageTitle,
          orderIndex: 0,
          isMasteryRequired: true,
        },
      });

      // Create SCORMExportJob record
      const job = await tx.sCORMExportJob.create({
        data: {
          organizationId,
          scormPackageId: pkg.id,
          contentVersionId: versionId!,
          status: "COMPLETED",
          progressPercent: 100,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      return { scormPackage: pkg, exportJob: job };
    });

    return {
      packageId: scormPackage.id,
      jobId: exportJob.id,
      format: scormPackage.format,
      title: scormPackage.packageTitle,
      version: scormPackage.versionString,
      manifestIdentifier: scormPackage.manifestIdentifier,
      checksumSha256: scormPackage.checksumSha256,
      storageKey: scormPackage.storageKey,
      fileSizeBytes: scormPackage.fileSizeBytes.toString(),
      launchFile: scormPackage.launchFile,
      status: "ready",
      progress: 100,
    };
  }

  /**
   * List packages for an organization / project
   */
  static async listPackages(organizationId: string, projectId?: string) {
    const where: Prisma.SCORMPackageWhereInput = { organizationId };
    if (projectId) {
      where.contentProjectId = projectId;
    }

    const packages = await prisma.sCORMPackage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        runtimeConfig: true,
        manifest: { select: { id: true, createdAt: true } },
      },
    });

    return packages.map((p: { fileSizeBytes: bigint; [key: string]: unknown }) => ({
      ...p,
      fileSizeBytes: p.fileSizeBytes.toString(),
    }));
  }

  /**
   * Get single package with full details
   */
  static async getPackageById(packageId: string, organizationId: string) {
    const pkg = await prisma.sCORMPackage.findFirst({
      where: { id: packageId, organizationId },
      include: {
        manifest: true,
        runtimeConfig: true,
        contentMappings: { orderBy: { orderIndex: "asc" } },
        exportJobs: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    if (!pkg) {
      throw AppError.notFound("SCORM package");
    }

    return {
      ...pkg,
      fileSizeBytes: pkg.fileSizeBytes.toString(),
    };
  }

  /**
   * Get raw manifest XML for package
   */
  static async getManifestXml(packageId: string, organizationId: string): Promise<string> {
    const manifest = await prisma.sCORMManifest.findFirst({
      where: {
        scormPackageId: packageId,
        scormPackage: { organizationId },
      },
    });

    if (!manifest) {
      throw AppError.notFound("Manifest XML");
    }

    return manifest.manifestXml;
  }
}
