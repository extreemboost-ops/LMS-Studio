/**
 * Phase 06: Analytics, Reporting & Audit Compliance Engine Test Suite
 * Suite 28: xAPI Engine, IMS Caliper Analytics, LMS Grade-Sync Audit, Aggregated Metrics, Telemetry
 */

import { XAPIEngineService, XAPIVerbs } from "../src/modules/analytics/xapi-engine.service.js";
import { CaliperEngineService } from "../src/modules/analytics/caliper-engine.service.js";
import { AuditComplianceService } from "../src/modules/analytics/audit-compliance.service.js";
import { AnalyticsService } from "../src/modules/analytics/analytics.service.js";
import { TelemetryService } from "../src/modules/analytics/telemetry.service.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runAnalyticsAuditComplianceTests(): Promise<{
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

  const testOrgId = "11111111-1111-4111-a111-111111111111";
  const testLearnerEmail = "alex.rivera@northstar.internal";

  // =========================================================================
  // 1. xAPI (Experience API / Tin Can) Statement Engine
  // =========================================================================
  try {
    // Duration formatting
    assert("formatIso8601Duration converts 754s to PT12M34S", XAPIEngineService.formatIso8601Duration(754) === "PT12M34S");
    assert("formatIso8601Duration converts 3665s to PT1H1M5S", XAPIEngineService.formatIso8601Duration(3665) === "PT1H1M5S");
    assert("formatIso8601Duration converts 0s to PT0S", XAPIEngineService.formatIso8601Duration(0) === "PT0S");

    // Statement validation: negative cases
    const invalidActor = XAPIEngineService.validateStatement({
      actor: { name: "No Email" },
      verb: XAPIVerbs.INITIALIZED,
      object: { id: "http://example.com/activity" },
    });
    assert("xAPI validator rejects actor missing mbox/account", !invalidActor.isValid);

    const invalidScore = XAPIEngineService.validateStatement({
      actor: { name: "Alex", mbox: "mailto:alex@test.com" },
      verb: XAPIVerbs.PASSED,
      object: { id: "http://example.com/activity" },
      result: { score: { scaled: 1.5 } }, // Out of bounds
    });
    assert("xAPI validator rejects scaled score outside [-1.0, 1.0]", !invalidScore.isValid);

    // Record valid xAPI statement
    const statement = XAPIEngineService.recordStatement({
      actor: { name: "Alex Rivera", mbox: testLearnerEmail },
      verb: XAPIVerbs.PASSED,
      object: {
        id: "https://studio.northstar.internal/courses/hazard-comm",
        definition: {
          name: { "en-US": "Hazard Communication & GHS Standards" },
          type: "http://adlnet.gov/expapi/activities/course",
        },
      },
      result: {
        score: { raw: 92, min: 0, max: 100, scaled: 0.92 },
        success: true,
        completion: true,
        duration: XAPIEngineService.formatIso8601Duration(1080),
      },
    });

    assert("xAPI statement generates RFC 4122 UUID identifier", !!statement.id && statement.id.length === 36);
    assert("xAPI statement enforces mailto: prefix on actor mbox", statement.actor.mbox === `mailto:${testLearnerEmail}`);
    assert("xAPI statement preserves ADL verb IRI", statement.verb.id === XAPIVerbs.PASSED.id);
    assert("xAPI statement specifies version 1.0.3", statement.version === "1.0.3");

    // Query statements
    const queried = XAPIEngineService.getStatements({ actorEmail: testLearnerEmail });
    assert("xAPI query retrieves recorded statement by actor email", queried.length > 0 && queried[0].id === statement.id);
  } catch (err: any) {
    assert("xAPI engine test crashed", false, err.message);
  }

  // =========================================================================
  // 2. IMS Caliper Analytics v1.2 Event Modeling
  // =========================================================================
  try {
    // Validation: negative cases
    const invalidContext = CaliperEngineService.validateEvent({
      "@context": "http://invalid-context.org",
      id: "urn:uuid:123",
      type: "AssessmentEvent",
    });
    assert("Caliper validator rejects invalid @context URI", !invalidContext.isValid);

    // Record AssessmentEvent
    const caliperEvent = CaliperEngineService.recordEvent({
      type: "AssessmentEvent",
      actor: {
        id: "https://studio.northstar.internal/users/alex-101",
        name: "Alex Rivera",
      },
      action: "Submitted",
      object: {
        id: "https://studio.northstar.internal/assessments/safety-quiz-1",
        type: "Assessment",
        name: "Workplace Safety Certification Assessment",
      },
      sessionId: "sess-9941",
    });

    assert("Caliper event has valid @context http://purl.imsglobal.org/ctx/caliper/v1p2", caliperEvent["@context"] === "http://purl.imsglobal.org/ctx/caliper/v1p2");
    assert("Caliper event id has urn:uuid: prefix", caliperEvent.id.startsWith("urn:uuid:"));
    assert("Caliper event sets actor type to Person", caliperEvent.actor.type === "Person");
    assert("Caliper event embeds edApp software application identity", !!caliperEvent.edApp && caliperEvent.edApp.type === "SoftwareApplication");
    assert("Caliper event embeds federated session identifier", !!caliperEvent.federatedSession && caliperEvent.federatedSession.id === "urn:session:sess-9941");

    // Query Caliper events
    const queriedEvents = CaliperEngineService.getEvents({ eventType: "AssessmentEvent" });
    assert("Caliper query retrieves recorded event by type", queriedEvents.length > 0);
  } catch (err: any) {
    assert("Caliper analytics test crashed", false, err.message);
  }

  // =========================================================================
  // 3. LMS Grade-Sync & Activity Audit Trail Logging
  // =========================================================================
  try {
    const lmsLog = await AuditComplianceService.recordLmsSyncLog({
      lmsConnectionId: "conn-canvas-prod",
      lmsDeploymentId: "dep-course-44",
      eventType: "GRADE_PUSH",
      status: "SUCCESS",
      payload: {
        learnerId: "user-ext-9921",
        scoreGiven: 0.95,
        scoreMaximum: 1.0,
        comment: "Completed SCORM 2004 module with 95% score",
      },
    });

    assert("LMS sync log generates unique identifier", !!lmsLog.id);
    assert("LMS sync log captures eventType GRADE_PUSH", lmsLog.eventType === "GRADE_PUSH");
    assert("LMS sync log captures SUCCESS status", lmsLog.status === "SUCCESS");

    // Query sync logs
    const logs = await AuditComplianceService.getLmsSyncLogs({ lmsConnectionId: "conn-canvas-prod" });
    assert("Query retrieves recorded LMS sync activity log", logs.length > 0 && logs[0].eventType === "GRADE_PUSH");
  } catch (err: any) {
    assert("LMS sync audit test crashed", false, err.message);
  }

  // =========================================================================
  // 4. Tamper-Evident Organization Audit Logs
  // =========================================================================
  try {
    const auditRecord = await AuditComplianceService.recordAuditLog({
      organizationId: testOrgId,
      action: "PACKAGE_EXPORT",
      entityType: "SCORMPackage",
      entityId: "pkg-scorm-2004-991",
      oldValues: { status: "Draft" },
      newValues: { status: "Exported", format: "SCORM_2004_4TH_EDITION" },
      ipAddress: "192.168.1.105",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });

    assert("Audit record records organization tenant context", auditRecord.organizationId === testOrgId);
    assert("Audit record captures action PACKAGE_EXPORT", auditRecord.action === "PACKAGE_EXPORT");
    assert("Audit record captures client IP address", auditRecord.ipAddress === "192.168.1.105");

    const auditQuery = await AuditComplianceService.getAuditLogs({
      organizationId: testOrgId,
      action: "PACKAGE_EXPORT",
    });
    assert("getAuditLogs retrieves audit record by organization and action", auditQuery.logs.length > 0);
  } catch (err: any) {
    assert("Audit compliance log test crashed", false, err.message);
  }

  // =========================================================================
  // 5. Learner Progress & Aggregated Analytics Engine
  // =========================================================================
  try {
    const metricsWeekly = await AnalyticsService.getDashboardMetrics(testOrgId, "Weekly");
    assert("Dashboard metrics returns 4 core KPI cards", metricsWeekly.kpis.length === 4);
    assert("Dashboard metrics includes Total learners KPI", metricsWeekly.kpis.some((k) => k.label === "Total learners"));
    assert("Weekly chart data contains 5 timeline points", metricsWeekly.chartData.points.length === 5);

    const metricsMonthly = await AnalyticsService.getDashboardMetrics(testOrgId, "Monthly");
    assert("Monthly chart data contains monthly data points", metricsMonthly.chartData.points.length === 4);

    assert("Format completion includes SCORM 2004, SCORM 1.2, and Native H5P", metricsWeekly.formatCompletion.length === 3);
    assert("Top performing content contains ranking entries", metricsWeekly.topContent.length >= 3);

    // CSV Report Generation
    const csvReport = await AnalyticsService.generateCsvReport(testOrgId);
    assert("CSV report begins with report header", csvReport.includes("Enterprise Analytics & Compliance Report"));
    assert("CSV report includes organization ID", csvReport.includes(testOrgId));
    assert("CSV report includes KPI section", csvReport.includes("KEY PERFORMANCE INDICATORS"));
    assert("CSV report includes TOP PERFORMING CONTENT section", csvReport.includes("TOP PERFORMING CONTENT"));
  } catch (err: any) {
    assert("Learner progress analytics test crashed", false, err.message);
  }

  // =========================================================================
  // 6. Enterprise Telemetry & Quota Accounting
  // =========================================================================
  try {
    const telemetry = await TelemetryService.getSystemTelemetry(testOrgId);

    assert("Telemetry includes storage totalBytesUsed", typeof telemetry.storage.totalBytesUsed === "string");
    assert("Telemetry computes quota utilization percentage", typeof telemetry.storage.quotaUtilizationPercent === "number");
    assert("Telemetry computes export queue success rate percentage", telemetry.exportQueue.successRatePercent >= 0 && telemetry.exportQueue.successRatePercent <= 100);
    assert("Telemetry computes LMS sync error rate percentage", telemetry.lmsSync.errorRatePercent >= 0 && telemetry.lmsSync.errorRatePercent <= 100);
    assert("Telemetry includes ISO timestamp", !isNaN(Date.parse(telemetry.timestamp)));
  } catch (err: any) {
    assert("Telemetry test crashed", false, err.message);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { passed, failed, results };
}
