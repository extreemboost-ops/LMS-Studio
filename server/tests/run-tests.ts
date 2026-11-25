import { runConfigTests } from "./config.test.js";
import { runValidationTests } from "./validation.test.js";
import { runHealthAndRouteTests } from "./health.test.js";
import { runAuthUnitTests } from "./auth.test.js";
import { runRbacTests } from "./rbac.test.js";
import { runTenantIsolationTests } from "./tenant.test.js";
import { runSecurityAuthLifecycleTests } from "./security-auth-lifecycle.test.js";
import { runSecurityCookiesCsrfCorsTests } from "./security-cookies-csrf-cors.test.js";
import { runSecurityRbacMatrixTests } from "./security-rbac-matrix.test.js";
import { runSecurityEmailInvitationTests } from "./security-email-invitations.test.js";
import { runSecurityRlsMechanicsTests } from "./security-rls-mechanics.test.js";
import { runCourseTests } from "./course.test.js";
import { runContentProjectTests } from "./content-project.test.js";
import { runContentVersioningTests } from "./content-versioning.test.js";
import { runCourseContentRbacTests } from "./course-content-rbac.test.js";
import { runH5PLibraryRegistryTests } from "./h5p-library-registry.test.js";
import { runH5PSemanticsValidationTests } from "./h5p-semantics-validation.test.js";
import { runH5PContentLifecycleTests } from "./h5p-content-lifecycle.test.js";
import { runH5PPackageImportTests } from "./h5p-package-import.test.js";
import { runScorm12RuntimeTests } from "./scorm-runtime-12.test.js";
import { runScorm2004RuntimeTests } from "./scorm-runtime-2004.test.js";
import { runScormPackagingTests } from "./scorm-packaging.test.js";
import { runLmsLti13ProtocolTests } from "./lms-lti13-protocol.test.js";
import { runLmsCredentialEncryptionTests } from "./lms-credential-encryption.test.js";
import { runLmsConnectorsLifecycleTests } from "./lms-connectors-lifecycle.test.js";
import { runAuthoringCanvasTests } from "./authoring-canvas.test.js";
import { runCloudStorageExportTests } from "./cloud-storage-export.test.js";
import { runAnalyticsAuditComplianceTests } from "./analytics-audit-compliance.test.js";
import { runSystemE2ETests } from "./e2e-system-integration.test.js";
import { runSaasEntitlementsTests } from "./saas-entitlements.test.js";
import { runBillingStripeLicenseTests } from "./billing-stripe-license.test.js";
import { runDistributorHubTests } from "./distributor-hub.test.js";
import { runWhiteLabelBrandingTests } from "./white-label-branding.test.js";
import { runSaasDistributorE2ESecurityTests } from "./saas-distributor-e2e-security.test.js";
import { disconnectPrisma } from "../src/database/prisma.js";

async function main() {
  console.log("================================================================================");
  console.log("SCORM & H5P Authoring Studio — Full Security, Content & H5P Core Test Runner");
  console.log("================================================================================\n");

  const results: Array<{ name: string; passed: boolean; message: string; status: "PASS" | "FAIL" | "NOT_VERIFIED" }> = [];

  // Suite 1: Configuration Validation
  console.log("Running Suite 1: Configuration Validation...");
  const configResult = await runConfigTests();
  results.push({ name: "Configuration Validation", ...configResult, status: configResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${configResult.passed ? "✔ PASS" : "✖ FAIL"}: ${configResult.message}\n`);

  // Suite 2: Request Validation & Error Middleware
  console.log("Running Suite 2: Request Validation Middleware...");
  const valResult = await runValidationTests();
  results.push({ name: "Request Validation Middleware", ...valResult, status: valResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${valResult.passed ? "✔ PASS" : "✖ FAIL"}: ${valResult.message}\n`);

  // Suite 3: Health Endpoints, Request ID, and 404 Handling
  console.log("Running Suite 3: Health Endpoints & Route Handlers...");
  const healthResult = await runHealthAndRouteTests();
  results.push({ name: "Health Endpoints & Routes", ...healthResult, status: healthResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${healthResult.passed ? "✔ PASS" : "✖ FAIL"}: ${healthResult.message}\n`);

  // Suite 4: Argon2id Hashing, Crypto & JWT Security
  console.log("Running Suite 4: Argon2id Hashing & JWT Security...");
  const authResult = await runAuthUnitTests();
  results.push({ name: "Argon2id & JWT Token Security", ...authResult, status: authResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${authResult.passed ? "✔ PASS" : "✖ FAIL"}: ${authResult.message}\n`);

  // Suite 5: RBAC Role & Permission Matrix
  console.log("Running Suite 5: RBAC System Roles & Permissions Matrix...");
  const rbacResult = await runRbacTests();
  results.push({ name: "RBAC Matrix & Permission Guards", ...rbacResult, status: rbacResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${rbacResult.passed ? "✔ PASS" : "✖ FAIL"}: ${rbacResult.message}\n`);

  // Suite 6: Tenant Isolation & Spoofing Defense
  console.log("Running Suite 6: Tenant Isolation & Spoofing Defense...");
  const tenantResult = await runTenantIsolationTests();
  results.push({ name: "Tenant Isolation & Spoofing Defense", ...tenantResult, status: tenantResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${tenantResult.passed ? "✔ PASS" : "✖ FAIL"}: ${tenantResult.message}\n`);

  // Suite 7: Authentication Lifecycle, Rotation & Reuse Revocation
  console.log("Running Suite 7: Auth Lifecycle & Token Reuse Revocation...");
  const authLifecycleResult = await runSecurityAuthLifecycleTests();
  results.push({ name: "Auth Lifecycle & Token Reuse Revocation", ...authLifecycleResult, status: authLifecycleResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${authLifecycleResult.passed ? "✔ PASS" : "✖ FAIL"}: ${authLifecycleResult.message}\n`);

  // Suite 8: Cookie Flags, CSRF & Production CORS Policy
  console.log("Running Suite 8: Cookie Flags, CSRF & Production CORS Policy...");
  const cookieCorsResult = await runSecurityCookiesCsrfCorsTests();
  results.push({ name: "Cookie Flags, CSRF & Production CORS", ...cookieCorsResult, status: cookieCorsResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${cookieCorsResult.passed ? "✔ PASS" : "✖ FAIL"}: ${cookieCorsResult.message}\n`);

  // Suite 9: RBAC 5-Role Full Operational Permissions Matrix
  console.log("Running Suite 9: RBAC 5-Role Full Matrix Integration...");
  const rbacMatrixResult = await runSecurityRbacMatrixTests();
  results.push({ name: "RBAC 5-Role Operational Matrix", ...rbacMatrixResult, status: rbacMatrixResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${rbacMatrixResult.passed ? "✔ PASS" : "✖ FAIL"}: ${rbacMatrixResult.message}\n`);

  // Suite 10: Email Dispatcher, Token Expiration & Invitation Verification
  console.log("Running Suite 10: Email & Invitation Lifecycle...");
  const emailInvResult = await runSecurityEmailInvitationTests();
  results.push({ name: "Email & Invitation Security Lifecycle", ...emailInvResult, status: emailInvResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${emailInvResult.passed ? "✔ PASS" : "✖ FAIL"}: ${emailInvResult.message}\n`);

  // Suite 11: PostgreSQL Row-Level Security Mechanical Invariants
  console.log("Running Suite 11: PostgreSQL RLS Architecture & Diagnostics...");
  const rlsResult = await runSecurityRlsMechanicsTests();
  results.push({
    name: "PostgreSQL RLS Invariants & Catalogs",
    ...rlsResult,
    status: rlsResult.isDbLive ? (rlsResult.passed ? "PASS" : "FAIL") : "NOT_VERIFIED",
  });
  console.log(`  -> [${rlsResult.isDbLive ? (rlsResult.passed ? "PASS" : "FAIL") : "NOT VERIFIED (PENDING DB CREDS)"}]: ${rlsResult.message}\n`);

  // Suite 12: Course, Module & Lesson Management (Phase 03.3)
  console.log("Running Suite 12: Course, Module & Lesson Engine (Phase 03.3)...");
  const courseResult = await runCourseTests();
  results.push({ name: "Course, Module & Lesson Engine", ...courseResult, status: courseResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${courseResult.passed ? "✔ PASS" : "✖ FAIL"}: ${courseResult.message}\n`);

  // Suite 13: Interactive Content Project & Element Tree (Phase 03.3)
  console.log("Running Suite 13: Content Projects & Element Tree Engine (Phase 03.3)...");
  const projectResult = await runContentProjectTests();
  results.push({ name: "Content Projects & Element Tree Engine", ...projectResult, status: projectResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${projectResult.passed ? "✔ PASS" : "✖ FAIL"}: ${projectResult.message}\n`);

  // Suite 14: Content Versioning & Immutable Snapshots (Phase 03.3)
  console.log("Running Suite 14: Content Versioning & Immutable Snapshots (Phase 03.3)...");
  const versionResult = await runContentVersioningTests();
  results.push({ name: "Content Versioning & Snapshots", ...versionResult, status: versionResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${versionResult.passed ? "✔ PASS" : "✖ FAIL"}: ${versionResult.message}\n`);

  // Suite 15: Course & Content RBAC Enforcement (Phase 03.3)
  console.log("Running Suite 15: Course & Content RBAC Enforcement (Phase 03.3)...");
  const rbacCourseResult = await runCourseContentRbacTests();
  results.push({ name: "Course & Content RBAC Enforcement", ...rbacCourseResult, status: rbacCourseResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${rbacCourseResult.passed ? "✔ PASS" : "✖ FAIL"}: ${rbacCourseResult.message}\n`);

  // Suite 16: H5P Library Registry & Dependency DAG (Phase 03.4)
  console.log("Running Suite 16: H5P Library Registry & Dependency DAG (Phase 03.4)...");
  const h5pLibResult = await runH5PLibraryRegistryTests();
  results.push({ name: "H5P Library Registry & DAG", ...h5pLibResult, status: h5pLibResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${h5pLibResult.passed ? "✔ PASS" : "✖ FAIL"}: ${h5pLibResult.message}\n`);

  // Suite 17: H5P Semantics Validation & XSS Defense (Phase 03.4)
  console.log("Running Suite 17: H5P Semantics Validation & XSS Defense (Phase 03.4)...");
  const h5pSemResult = await runH5PSemanticsValidationTests();
  results.push({ name: "H5P Semantics Validation & XSS Defense", ...h5pSemResult, status: h5pSemResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${h5pSemResult.passed ? "✔ PASS" : "✖ FAIL"}: ${h5pSemResult.message}\n`);

  // Suite 18: H5P Content Lifecycle & Player Asset Bundle (Phase 03.4)
  console.log("Running Suite 18: H5P Content Lifecycle & Player Bundle (Phase 03.4)...");
  const h5pContentResult = await runH5PContentLifecycleTests();
  results.push({ name: "H5P Content Lifecycle & Player Bundle", ...h5pContentResult, status: h5pContentResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${h5pContentResult.passed ? "✔ PASS" : "✖ FAIL"}: ${h5pContentResult.message}\n`);

  // Suite 19: H5P Package Import & Manifest Validation (Phase 03.4)
  console.log("Running Suite 19: H5P Package Import & Manifest Validation (Phase 03.4)...");
  const h5pPackageResult = await runH5PPackageImportTests();
  results.push({ name: "H5P Package Import & Manifest Validation", ...h5pPackageResult, status: h5pPackageResult.passed ? "PASS" : "FAIL" });
  console.log(`  -> ${h5pPackageResult.passed ? "✔ PASS" : "✖ FAIL"}: ${h5pPackageResult.message}\n`);

  // Suite 20: SCORM 1.2 Runtime CMI Engine (Phase 03.5)
  console.log("Running Suite 20: SCORM 1.2 Runtime CMI Engine (Phase 03.5)...");
  const scorm12Result = await runScorm12RuntimeTests();
  const scorm12Passed = scorm12Result.failed === 0;
  results.push({
    name: "SCORM 1.2 Runtime CMI Engine",
    passed: scorm12Passed,
    message: `${scorm12Result.passed} passed, ${scorm12Result.failed} failed`,
    status: scorm12Passed ? "PASS" : "FAIL",
  });
  console.log(`  -> ${scorm12Passed ? "✔ PASS" : "✖ FAIL"}: ${scorm12Result.passed} passed, ${scorm12Result.failed} failed\n`);

  // Suite 21: SCORM 2004 Runtime & Status Decoupling Engine (Phase 03.5)
  console.log("Running Suite 21: SCORM 2004 Runtime & Status Decoupling Engine (Phase 03.5)...");
  const scorm2004Result = await runScorm2004RuntimeTests();
  const scorm2004Passed = scorm2004Result.failed === 0;
  results.push({
    name: "SCORM 2004 Runtime & Status Decoupling Engine",
    passed: scorm2004Passed,
    message: `${scorm2004Result.passed} passed, ${scorm2004Result.failed} failed`,
    status: scorm2004Passed ? "PASS" : "FAIL",
  });
  console.log(`  -> ${scorm2004Passed ? "✔ PASS" : "✖ FAIL"}: ${scorm2004Result.passed} passed, ${scorm2004Result.failed} failed\n`);

  // Suite 22: SCORM Manifest Packaging & Bridge Generation (Phase 03.5)
  console.log("Running Suite 22: SCORM Manifest Packaging & Bridge Generation (Phase 03.5)...");
  const scormPkgResult = await runScormPackagingTests();
  const scormPkgPassed = scormPkgResult.failed === 0;
  results.push({
    name: "SCORM Manifest Packaging & Bridge Generation",
    passed: scormPkgPassed,
    message: `${scormPkgResult.passed} passed, ${scormPkgResult.failed} failed`,
    status: scormPkgPassed ? "PASS" : "FAIL",
  });
  console.log(`  -> ${scormPkgPassed ? "✔ PASS" : "✖ FAIL"}: ${scormPkgResult.passed} passed, ${scormPkgResult.failed} failed\n`);

  // Suite 23: LTI 1.3 Advantage & OIDC Security (Phase 03.6)
  console.log("Running Suite 23: LTI 1.3 Advantage & OIDC Security (Phase 03.6)...");
  const ltiResult = await runLmsLti13ProtocolTests();
  const ltiPassed = ltiResult.failed === 0;
  results.push({
    name: "LTI 1.3 Advantage & OIDC Security",
    passed: ltiPassed,
    message: `${ltiResult.passed} passed, ${ltiResult.failed} failed`,
    status: ltiPassed ? "PASS" : "FAIL",
  });
  console.log(`  -> ${ltiPassed ? "✔ PASS" : "✖ FAIL"}: ${ltiResult.passed} passed, ${ltiResult.failed} failed\n`);

  // Suite 24: LMS Credential Encryption & AEAD Tamper Defense (Phase 03.6)
  console.log("Running Suite 24: LMS Credential Encryption & AEAD Tamper Defense (Phase 03.6)...");
  const encResult = await runLmsCredentialEncryptionTests();
  const encPassed = encResult.failed === 0;
  results.push({
    name: "LMS Credential Encryption & AEAD Tamper Defense",
    passed: encPassed,
    message: `${encResult.passed} passed, ${encResult.failed} failed`,
    status: encPassed ? "PASS" : "FAIL",
  });
  console.log(`  -> ${encPassed ? "✔ PASS" : "✖ FAIL"}: ${encResult.passed} passed, ${encResult.failed} failed\n`);

  // Suite 25: LMS Connectors Lifecycle & Grade Push (Phase 03.6)
  console.log("Running Suite 25: LMS Connectors Lifecycle & Grade Push (Phase 03.6)...");
  const connResult = await runLmsConnectorsLifecycleTests();
  const connPassed = connResult.failed === 0;
  results.push({
    name: "LMS Connectors Lifecycle & Grade Push",
    passed: connPassed,
    message: `${connResult.passed} passed, ${connResult.failed} failed`,
    status: connPassed ? "PASS" : "FAIL",
  });
  console.log(`  -> ${connPassed ? "✔ PASS" : "✖ FAIL"}: ${connResult.passed} passed, ${connResult.failed} failed\n`);

  // Suite 26: Interactive Authoring Canvas, Hotspots & Studio Editor Sync (Phase 04)
  console.log("Running Suite 26: Interactive Authoring Canvas, Hotspots & Studio Editor Sync (Phase 04)...");
  const canvasResult = await runAuthoringCanvasTests();
  const canvasPassed = canvasResult.failed === 0;
  results.push({
    name: "Interactive Authoring Canvas, Hotspots & Studio Editor Sync",
    passed: canvasPassed,
    message: `${canvasResult.passed} passed, ${canvasResult.failed} failed`,
    status: canvasPassed ? "PASS" : "FAIL",
  });
  console.log(`  -> ${canvasPassed ? "✔ PASS" : "✖ FAIL"}: ${canvasResult.passed} passed, ${canvasResult.failed} failed\n`);

  // Suite 27: Cloud Packaging, Storage & Export Automation Engine (Phase 05)
  console.log("Running Suite 27: Cloud Packaging, Storage & Export Automation Engine (Phase 05)...");
  const exportResult = await runCloudStorageExportTests();
  const exportPassed = exportResult.failed === 0;
  results.push({
    name: "Cloud Packaging, Storage & Export Automation Engine",
    passed: exportPassed,
    message: `${exportResult.passed} passed, ${exportResult.failed} failed`,
    status: exportPassed ? "PASS" : "FAIL",
  });
  console.log(`  -> ${exportPassed ? "✔ PASS" : "✖ FAIL"}: ${exportResult.passed} passed, ${exportResult.failed} failed\n`);

  // Suite 28: Analytics, Reporting & Audit Compliance Engine (Phase 06)
  console.log("Running Suite 28: Analytics, Reporting & Audit Compliance Engine (Phase 06)...");
  const analyticsResult = await runAnalyticsAuditComplianceTests();
  const analyticsPassed = analyticsResult.failed === 0;
  results.push({
    name: "Analytics, Reporting & Audit Compliance Engine",
    passed: analyticsPassed,
    message: `${analyticsResult.passed} passed, ${analyticsResult.failed} failed`,
    status: analyticsPassed ? "PASS" : "FAIL",
  });
  console.log(`  -> ${analyticsPassed ? "✔ PASS" : "✖ FAIL"}: ${analyticsResult.passed} passed, ${analyticsResult.failed} failed\n`);

  // Suite 29: Production Hardening & Full System E2E Integration (Phase 07)
  console.log("Running Suite 29: Production Hardening & Full System E2E Integration (Phase 07)...");
  const e2eResult = await runSystemE2ETests();
  const e2ePassed = e2eResult.failed === 0;
  if (!e2ePassed) {
    e2eResult.results.filter(r => !r.passed).forEach(r => console.log(`    ❌ FAILED ASSERTION: [${r.name}] -> ${r.error}`));
  }
  results.push({
    name: "Production Hardening & Full System E2E Integration",
    passed: e2ePassed,
    message: `${e2eResult.passed} passed, ${e2eResult.failed} failed`,
    status: e2ePassed ? "PASS" : "FAIL",
  });
  console.log(`  -> ${e2ePassed ? "✔ PASS" : "✖ FAIL"}: ${e2eResult.passed} passed, ${e2eResult.failed} failed\n`);

  // Suite 30: SaaS Plans, Entitlements & Quota Engine (Phase 08.1)
  console.log("Running Suite 30: SaaS Plans, Entitlements & Quota Engine (Phase 08.1)...");
  const saasResult = await runSaasEntitlementsTests();
  const saasPassed = saasResult.failed === 0;
  if (!saasPassed) {
    saasResult.results.filter(r => !r.passed).forEach(r => console.log(`    ❌ FAILED ASSERTION: [${r.name}] -> ${r.error}`));
  }
  results.push({
    name: "SaaS Plans, Entitlements & Quota Engine",
    passed: saasPassed,
    message: `${saasResult.passed} passed, ${saasResult.failed} failed`,
    status: saasPassed ? "PASS" : "FAIL",
  });
  console.log(`  -> ${saasPassed ? "✔ PASS" : "✖ FAIL"}: ${saasResult.passed} passed, ${saasResult.failed} failed\n`);

  // Suite 31: Stripe Billing, Webhook Security & B2B License Keys (Phase 08.2)
  console.log("Running Suite 31: Stripe Billing, Webhook Security & B2B License Keys (Phase 08.2)...");
  const billingResult = await runBillingStripeLicenseTests();
  const billingPassed = billingResult.failed === 0;
  if (!billingPassed) {
    billingResult.results.filter(r => !r.passed).forEach(r => console.log(`    ❌ FAILED ASSERTION: [${r.name}] -> ${r.error}`));
  }
  results.push({
    name: "Stripe Billing, Webhook Security & B2B License Keys",
    passed: billingPassed,
    message: `${billingResult.passed} passed, ${billingResult.failed} failed`,
    status: billingPassed ? "PASS" : "FAIL",
  });
  console.log(`  -> ${billingPassed ? "✔ PASS" : "✖ FAIL"}: ${billingResult.passed} passed, ${billingResult.failed} failed\n`);

  // Suite 32: Distributor Hub, Client Provisioning & Cross-Distributor RLS (Phase 08.3)
  console.log("Running Suite 32: Distributor Hub, Client Provisioning & Cross-Distributor RLS (Phase 08.3)...");
  const distResult = await runDistributorHubTests();
  const distPassed = distResult.failed === 0;
  if (!distPassed) {
    distResult.results.filter(r => !r.passed).forEach(r => console.log(`    ❌ FAILED ASSERTION: [${r.name}] -> ${r.error}`));
  }
  results.push({
    name: "Distributor Hub, Client Provisioning & Cross-Distributor RLS",
    passed: distPassed,
    message: `${distResult.passed} passed, ${distResult.failed} failed`,
    status: distPassed ? "PASS" : "FAIL",
  });
  console.log(`  -> ${distPassed ? "✔ PASS" : "✖ FAIL"}: ${distResult.passed} passed, ${distResult.failed} failed\n`);

  // Suite 33: White-Label Branding & Custom Domain Engine (Phase 08.4)
  console.log("Running Suite 33: White-Label Branding & Custom Domain Engine (Phase 08.4)...");
  const brandResult = await runWhiteLabelBrandingTests();
  const brandPassed = brandResult.failed === 0;
  if (!brandPassed) {
    brandResult.results.filter(r => !r.passed).forEach(r => console.log(`    ❌ FAILED ASSERTION: [${r.name}] -> ${r.error}`));
  }
  results.push({
    name: "White-Label Branding & Custom Domain Engine",
    passed: brandPassed,
    message: `${brandResult.passed} passed, ${brandResult.failed} failed`,
    status: brandPassed ? "PASS" : "FAIL",
  });
  console.log(`  -> ${brandPassed ? "✔ PASS" : "✖ FAIL"}: ${brandResult.passed} passed, ${brandResult.failed} failed\n`);

  // Suite 34: Final SaaS & Distributor Security Gate (Phase 08.6)
  console.log("Running Suite 34: Final SaaS & Distributor Security Gate (Phase 08.6)...");
  const gateResult = await runSaasDistributorE2ESecurityTests();
  const gatePassed = gateResult.failed === 0;
  if (!gatePassed) {
    gateResult.results.filter(r => !r.passed).forEach(r => console.log(`    ❌ FAILED ASSERTION: [${r.name}] -> ${r.error}`));
  }
  results.push({
    name: "Final SaaS & Distributor Security Gate",
    passed: gatePassed,
    message: `${gateResult.passed} passed, ${gateResult.failed} failed`,
    status: gatePassed ? "PASS" : "FAIL",
  });
  console.log(`  -> ${gatePassed ? "✔ PASS" : "✖ FAIL"}: ${gateResult.passed} passed, ${gateResult.failed} failed\n`);

  // Disconnect any active connections
  await disconnectPrisma();

  console.log("================================================================================");
  console.log("SUMMARY OF FULL TEST RESULTS (ALL 29 SUITES — PHASE 01 THROUGH PHASE 07):");
  console.log("================================================================================");

  let allExecutedPassed = true;
  for (const r of results) {
    const symbol = r.status === "PASS" ? "✔ PASS" : r.status === "NOT_VERIFIED" ? "⚠ NOT VERIFIED" : "✖ FAIL";
    console.log(`${symbol} - ${r.name}: ${r.message}`);
    if (r.status === "FAIL") allExecutedPassed = false;
  }

  console.log("================================================================================");

  if (!allExecutedPassed) {
    console.error("Test execution encountered FAILURES.");
    process.exit(1);
  } else {
    console.log("All Phase 07 Production Hardening & Full System E2E Integration tests passed successfully! 🚀🏆");
    process.exit(0);
  }
}

main().catch(async (err) => {
  console.error("Fatal test runner error:", err);
  await disconnectPrisma();
  process.exit(1);
});
