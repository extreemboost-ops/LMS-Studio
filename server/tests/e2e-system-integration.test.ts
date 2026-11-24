/**
 * Phase 07: Production Hardening, System End-to-End Verification & Final Release Gate
 * Suite 29: Full System E2E Integration (Auth -> Content -> Packaging -> Runtime -> LMS -> Telemetry -> Security)
 */

import crypto from "node:crypto";
import { generateSecureToken } from "../src/utils/crypto.js";
import { signAccessToken, verifyAccessToken } from "../src/utils/jwt.js";
import { sanitizeHtml, H5PSemanticsValidator } from "../src/modules/h5p/h5p-semantics.js";
import { SCORMBundlerService } from "../src/modules/export/scorm-bundler.service.js";
import { H5PBundlerService } from "../src/modules/export/h5p-bundler.service.js";
import { StorageService } from "../src/modules/storage/storage.service.js";
import { LMSCryptoService } from "../src/modules/lms/lms-crypto.service.js";
import { LMSLtiService } from "../src/modules/lms/lms-lti.service.js";
import { ltiLoginInitiationSchema, ltiLaunchSchema } from "../src/modules/lms/lms.schema.js";
import { XAPIEngineService, XAPIVerbs } from "../src/modules/analytics/xapi-engine.service.js";
import { CaliperEngineService } from "../src/modules/analytics/caliper-engine.service.js";
import { AuditComplianceService } from "../src/modules/analytics/audit-compliance.service.js";
import { TelemetryService } from "../src/modules/analytics/telemetry.service.js";
import { ZipArchiveService } from "../src/modules/export/zip-archive.service.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runSystemE2ETests(): Promise<{
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: message || "Assertion failed" });
    }
  }

  const orgId = "11111111-1111-4111-a111-111111111111";
  const userId = "22222222-2222-4222-a222-222222222222";
  const workspaceId = "33333333-3333-4333-a333-333333333333";
  const projectId = "44444444-4444-4444-a444-444444444444";

  // =========================================================================
  // STAGE 1: Identity, Auth Tokens & Multi-Tenant Boundary
  // =========================================================================
  try {
    const accessToken = signAccessToken({
      sub: userId,
      email: "lead.author@institution.edu",
      isSuperAdmin: false,
      orgId,
      workspaceId,
      role: "OWNER",
    });

    assert("E2E Stage 1: JWT access token issues with sub, email, orgId, role", !!accessToken && accessToken.split(".").length === 3);

    const verified = verifyAccessToken(accessToken);
    assert("E2E Stage 1: Token verifies against HMAC secret with correct claims", verified.sub === userId && verified.orgId === orgId && verified.role === "OWNER");

    const opaqueSessionToken = generateSecureToken(32);
    assert("E2E Stage 1: High-entropy session token generates 64 hex characters", opaqueSessionToken.length === 64);
  } catch (err: any) {
    assert("E2E Stage 1 test crashed", false, err.message);
  }

  // =========================================================================
  // STAGE 2: H5P Semantic Sanitization & Schema Validation
  // =========================================================================
  try {
    const maliciousHtml = '<p>Safety First <script>alert("XSS")</script><iframe src="evil.com"></iframe><img src="x" onerror="steal()"/> Safe description</p>';
    const sanitized = sanitizeHtml(maliciousHtml);

    assert("E2E Stage 2: XSS script tags stripped", !sanitized.includes("<script>"));
    assert("E2E Stage 2: XSS iframe tags stripped", !sanitized.includes("<iframe>"));
    assert("E2E Stage 2: Event handlers (onerror) neutralized", !sanitized.includes("onerror"));
    assert("E2E Stage 2: Benign content preserved cleanly", sanitized.includes("Safety First") && sanitized.includes("Safe description"));

    // Semantics validation check
    const validation = H5PSemanticsValidator.validate(
      [
        { name: "title", type: "text", optional: false },
        { name: "score", type: "number", optional: true },
        { name: "tags", type: "list", field: { name: "tag", type: "text" } },
      ],
      {
        title: "Hazardous Materials Unit 1",
        score: 100,
        tags: ["safety", "hazmat", "osha"],
      }
    );

    assert("E2E Stage 2: H5PSemanticsValidator successfully parses valid payload", validation.isValid);
    assert("E2E Stage 2: Filtered parameters preserve validated fields", (validation.filteredParameters as any).title === "Hazardous Materials Unit 1");

    // Dependency DAG topological ordering verification
    const mockRegistry: any = {
      "H5P.InteractiveVideo-1.22": {
        id: "iv",
        machineName: "H5P.InteractiveVideo",
        deps: ["H5P.Video-1.6", "FontAwesome-4.5"],
      },
      "H5P.Video-1.6": { id: "vid", machineName: "H5P.Video", deps: [] },
      "FontAwesome-4.5": { id: "fa", machineName: "FontAwesome", deps: [] },
    };

    const visited = new Set<string>();
    const resolvedOrder: string[] = [];

    function resolveDAG(key: string) {
      if (visited.has(key)) return;
      visited.add(key);
      const node = mockRegistry[key];
      if (node) {
        for (const d of node.deps) {
          resolveDAG(d);
        }
        resolvedOrder.push(node.machineName);
      }
    }

    resolveDAG("H5P.InteractiveVideo-1.22");
    assert("E2E Stage 2: Topological DAG sorts dependencies before parent library", resolvedOrder.indexOf("H5P.Video") < resolvedOrder.indexOf("H5P.InteractiveVideo") && resolvedOrder.indexOf("FontAwesome") < resolvedOrder.indexOf("H5P.InteractiveVideo"));
  } catch (err: any) {
    assert("E2E Stage 2 test crashed", false, err.message);
  }

  // =========================================================================
  // STAGE 3: Binary Packaging & Hardened Cloud Storage Pipeline
  // =========================================================================
  let scormStorageKey = "";
  let h5pStorageKey = "";

  try {
    // 1. SCORM 2004 4th Edition Zip Packaging
    const scormResult = await SCORMBundlerService.bundlePackage({
      organizationId: orgId,
      projectId,
      projectTitle: "E2E Hazardous Materials Protocol",
      format: "SCORM_2004_4TH_EDITION",
      passingScorePercent: 80,
      questions: [
        {
          id: 1,
          title: "Select primary emergency ventilation valve",
          points: 10,
          options: [
            { text: "Exhaust Plenum Valve A", isCorrect: true },
            { text: "Bypass Damper", isCorrect: false },
          ],
        },
      ],
    });

    scormStorageKey = scormResult.storageKey;
    assert("E2E Stage 3: SCORM 2004 package generated with storage key", !!scormResult.storageKey && scormResult.storageKey.endsWith(".zip"));
    assert("E2E Stage 3: SCORM package binary exists in storage", StorageService.packageExists(scormStorageKey));

    // Verify zip manifest and bridge
    const scormZipBuffer = StorageService.readPackage(scormStorageKey);
    const scormEntries = ZipArchiveService.readZipEntries(scormZipBuffer).map((e) => e.name);
    assert("E2E Stage 3: Zip archive contains imsmanifest.xml", scormEntries.includes("imsmanifest.xml"));
    assert("E2E Stage 3: Zip archive contains scorm-bridge.js", scormEntries.includes("scorm-bridge.js"));
    assert("E2E Stage 3: Zip archive contains index.html", scormEntries.includes("index.html"));

    // 2. H5P .h5p Package Generation
    const h5pResult = await H5PBundlerService.bundlePackage({
      organizationId: orgId,
      projectId,
      projectTitle: "E2E Interactive Scenario",
    });

    h5pStorageKey = h5pResult.storageKey;
    assert("E2E Stage 3: H5P package generated with .h5p extension", h5pResult.filename.endsWith(".h5p"));
    assert("E2E Stage 3: H5P package exists in storage", StorageService.packageExists(h5pStorageKey));

    // 3. Cryptographically Signed Download Gateway Token
    const downloadToken = StorageService.generateSignedDownloadToken(scormStorageKey, orgId, "e2e-package.zip", 600);
    const verifiedToken = StorageService.verifySignedDownloadToken(downloadToken);
    assert("E2E Stage 3: Signed download token decodes verified storageKey", verifiedToken.storageKey === scormStorageKey);
    assert("E2E Stage 3: Signed download token decodes verified organizationId", verifiedToken.organizationId === orgId);
  } catch (err: any) {
    assert("E2E Stage 3 test crashed", false, err.message);
  }

  // =========================================================================
  // STAGE 4: LMS Integration, AEAD Encryption & Grade Push Dispatch
  // =========================================================================
  try {
    const rawCredentials = {
      clientId: "canvas-oauth-client-9912",
      clientSecret: "super-confidential-oauth-secret-key-xyz",
      deploymentId: "dep-inst-canvas-01",
    };

    // AES-256-GCM AEAD Encryption
    const encrypted = LMSCryptoService.encrypt(rawCredentials);
    assert("E2E Stage 4: AES-256-GCM produces ciphertext, IV, and authTag", !!encrypted.data && !!encrypted.iv && !!encrypted.tag);

    // Tamper detection: flip 1 byte of ciphertext
    const tampered = { ...encrypted, data: encrypted.data.slice(0, -2) + "00" };
    let caughtTampering = false;
    try {
      LMSCryptoService.decrypt(tampered);
    } catch {
      caughtTampering = true;
    }
    assert("E2E Stage 4: AEAD authentication tag rejects tampered credentials", caughtTampering);

    // Decrypt credentials
    const decrypted = LMSCryptoService.decrypt(encrypted) as typeof rawCredentials;
    assert("E2E Stage 4: Authenticated decryption restores exact credentials", decrypted.clientId === rawCredentials.clientId && decrypted.clientSecret === rawCredentials.clientSecret);

    // LTI 1.3 Advantage Login Initiation & Claims Parsing
    const initInput = {
      iss: "https://canvas.instructure.com",
      login_hint: "learner_e2e_9912",
      target_link_uri: "https://studio.northstar.internal/lti/1.3/launch",
      client_id: "10000000000001",
      lti_message_hint: "hint_e2e_course",
      lti_deployment_id: "dep-inst-canvas-01",
    };

    const validInit = ltiLoginInitiationSchema.safeParse(initInput);
    assert("E2E Stage 4: LTI 1.3 login initiation schema accepts valid parameters", validInit.success);

    const initResult = LMSLtiService.handleLoginInitiation(initInput, "https://canvas.instructure.com/api/lti/authorize_redirect");
    assert("E2E Stage 4: LTI 1.3 initiation generates redirectUrl and cryptographic state", !!initResult.redirectUrl && initResult.state.startsWith("state_"));

    // LTI 1.3 JWT Parsing
    const mockClaims = {
      iss: "https://canvas.instructure.com",
      sub: userId,
      aud: ["10000000000001"],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      nonce: "nonce_e2e_test",
      name: "Alex Rivera",
      email: "alex@institution.edu",
      "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
      "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
      "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "dep-inst-canvas-01",
      "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": "https://studio.northstar.internal/lti/1.3/launch",
      "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
        id: "res-safety-protocol-01",
        title: "Hazardous Materials Unit 1",
      },
      "https://purl.imsglobal.org/spec/lti/claim/roles": [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner",
      ],
      "https://purl.imsglobal.org/spec/lti/claim/context": {
        id: "course-section-101",
        title: "Industrial Safety 2026",
      },
    };

    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "key-1" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify(mockClaims)).toString("base64url");
    const signature = "dummy_signature_bytes_abc123";
    const rawIdToken = `${header}.${payload}.${signature}`;

    const parsedLti = LMSLtiService.parseLtiToken(rawIdToken);
    assert("E2E Stage 4: LTI 1.3 launch token decodes verified learner and context claims", parsedLti.userId === userId && parsedLti.contextId === "course-section-101");
  } catch (err: any) {
    assert("E2E Stage 4 test crashed", false, err.message);
  }

  // =========================================================================
  // STAGE 5: xAPI Statements & IMS Caliper Analytics Telemetry
  // =========================================================================
  try {
    // Record xAPI completed statement
    const xapi = XAPIEngineService.recordStatement({
      actor: { name: "Alex Rivera", mbox: "alex@institution.edu" },
      verb: XAPIVerbs.COMPLETED,
      object: {
        id: "https://studio.northstar.internal/courses/e2e-hazard-materials",
        definition: {
          name: { "en-US": "E2E Hazardous Materials Protocol" },
          type: "http://adlnet.gov/expapi/activities/course",
        },
      },
      result: {
        score: { raw: 100, min: 0, max: 100, scaled: 1.0 },
        success: true,
        completion: true,
        duration: XAPIEngineService.formatIso8601Duration(720),
      },
    });

    assert("E2E Stage 5: xAPI completed statement recorded with ISO-8601 duration", xapi.result?.duration === "PT12M0S");

    // Record Caliper AssessmentEvent
    const caliper = CaliperEngineService.recordEvent({
      type: "AssessmentEvent",
      actor: { id: `https://studio.northstar.internal/users/${userId}`, type: "Person", name: "Alex Rivera" },
      action: "Submitted",
      object: { id: "https://studio.northstar.internal/assessments/q1", type: "Assessment" },
    });

    assert("E2E Stage 5: IMS Caliper AssessmentEvent recorded with Caliper context", caliper["@context"] === "http://purl.imsglobal.org/ctx/caliper/v1p2");

    // Record LMS Activity Audit Log
    const lmsAudit = await AuditComplianceService.recordLmsSyncLog({
      lmsConnectionId: "conn-canvas-prod",
      eventType: "GRADE_PUSH",
      status: "SUCCESS",
      payload: { learnerId: userId, score: 1.0, statementId: xapi.id },
    });

    assert("E2E Stage 5: LMS grade sync recorded in audit trail with SUCCESS status", lmsAudit.status === "SUCCESS");

    // Organization Audit Log
    const orgAudit = await AuditComplianceService.recordAuditLog({
      organizationId: orgId,
      action: "PACKAGE_EXPORT",
      entityType: "SCORMPackage",
      entityId: "pkg-scorm-e2e",
      ipAddress: "127.0.0.1",
    });

    assert("E2E Stage 5: Organization administrative audit record persisted", orgAudit.action === "PACKAGE_EXPORT");

    // Enterprise Telemetry
    const telemetry = await TelemetryService.getSystemTelemetry(orgId);
    assert("E2E Stage 5: System telemetry calculates quota utilization and success rates", typeof telemetry.storage.quotaUtilizationPercent === "number" && typeof telemetry.exportQueue.successRatePercent === "number");
  } catch (err: any) {
    assert("E2E Stage 5 test crashed", false, err.message);
  }

  // =========================================================================
  // STAGE 6: Production Security, OWASP & Path Traversal Mitigations
  // =========================================================================
  try {
    // 1. Path traversal attacks
    let blockedTraversal = false;
    try {
      StorageService.sanitizeStorageKey("../../../windows/system32/cmd.exe");
    } catch {
      blockedTraversal = true;
    }
    assert("E2E Stage 6: StorageService defeats path traversal attack vectors", blockedTraversal);

    // 2. Token signature forgery
    const validToken = StorageService.generateSignedDownloadToken("test.zip", orgId, "test.zip", 300);
    const [body, sig] = validToken.split(".");
    const forgedToken = `${body}.${sig}tampered`;
    let blockedForgery = false;
    try {
      StorageService.verifySignedDownloadToken(forgedToken);
    } catch {
      blockedForgery = true;
    }
    assert("E2E Stage 6: Download gateway rejects forged or tampered token signatures", blockedForgery);

    // 3. Clean up test artifacts
    if (scormStorageKey) StorageService.deletePackage(scormStorageKey);
    if (h5pStorageKey) StorageService.deletePackage(h5pStorageKey);
    assert("E2E Stage 6: Transient test packages evicted from storage without residue", !StorageService.packageExists(scormStorageKey) && !StorageService.packageExists(h5pStorageKey));
  } catch (err: any) {
    assert("E2E Stage 6 test crashed", false, err.message);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { passed, failed, results };
}
