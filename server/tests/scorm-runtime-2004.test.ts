import { SCORMTimeHelper } from "../src/modules/scorm/scorm-runtime.service.js";
import { scormCommitSchema, scormInteractionSchema } from "../src/modules/scorm/scorm.schema.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runScorm2004RuntimeTests(): Promise<{ passed: number; failed: number; results: TestResult[] }> {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: message || "Assertion failed" });
    }
  }

  // 1. ISO 8601 Duration Parsing & Formatting
  try {
    const d1 = SCORMTimeHelper.parseScorm2004Time("PT1H30M15S");
    assert("SCORM 2004 parseScorm2004Time PT1H30M15S -> 5415s", d1 === 5415, `Expected 5415 but got ${d1}`);

    const d2 = SCORMTimeHelper.parseScorm2004Time("PT45S");
    assert("SCORM 2004 parseScorm2004Time PT45S -> 45s", d2 === 45, `Expected 45 but got ${d2}`);

    const d3 = SCORMTimeHelper.parseScorm2004Time("PT2M");
    assert("SCORM 2004 parseScorm2004Time PT2M -> 120s", d3 === 120, `Expected 120 but got ${d3}`);

    const f1 = SCORMTimeHelper.formatScorm2004Time(5415);
    assert("SCORM 2004 formatScorm2004Time 5415s -> PT1H30M15S", f1 === "PT1H30M15S", `Expected PT1H30M15S but got ${f1}`);

    const f2 = SCORMTimeHelper.formatScorm2004Time(45);
    assert("SCORM 2004 formatScorm2004Time 45s -> PT45S", f2 === "PT45S", `Expected PT45S but got ${f2}`);
  } catch (err: any) {
    assert("SCORM 2004 duration parsing threw error", false, err.message);
  }

  // 2. Decoupled completion_status and success_status validation
  try {
    const validDecoupled = scormCommitSchema.safeParse({
      attemptId: "22222222-2222-4222-a222-222222222222",
      scormStandard: "SCORM_2004_4TH_EDITION",
      completionStatus: "completed",
      successStatus: "passed",
      scoreScaled: 0.95,
      progressMeasure: 1.0,
    });
    assert("SCORM 2004 supports decoupled completion_status and success_status", validDecoupled.success);
  } catch (err: any) {
    assert("SCORM 2004 decoupled status verification threw error", false, err.message);
  }

  // 3. Scaled score boundaries (-1.000 to 1.000)
  try {
    const validScaled = scormCommitSchema.safeParse({
      attemptId: "22222222-2222-4222-a222-222222222222",
      scormStandard: "SCORM_2004_4TH_EDITION",
      scoreScaled: 0.85,
    });
    assert("SCORM 2004 accepts valid score.scaled (0.85)", validScaled.success);

    const invalidScaledHigh = scormCommitSchema.safeParse({
      attemptId: "22222222-2222-4222-a222-222222222222",
      scormStandard: "SCORM_2004_4TH_EDITION",
      scoreScaled: 1.5,
    });
    assert("SCORM 2004 rejects score.scaled > 1.0", !invalidScaledHigh.success);

    const invalidScaledLow = scormCommitSchema.safeParse({
      attemptId: "22222222-2222-4222-a222-222222222222",
      scormStandard: "SCORM_2004_4TH_EDITION",
      scoreScaled: -1.5,
    });
    assert("SCORM 2004 rejects score.scaled < -1.0", !invalidScaledLow.success);
  } catch (err: any) {
    assert("SCORM 2004 scaled score verification threw error", false, err.message);
  }

  // 4. Suspend data 64,000 char capacity
  try {
    const largeData = "B".repeat(16000);
    const validLarge = scormCommitSchema.safeParse({
      attemptId: "22222222-2222-4222-a222-222222222222",
      scormStandard: "SCORM_2004_4TH_EDITION",
      suspendData: largeData,
    });
    assert("SCORM 2004 accommodates 16,000+ characters in suspend_data", validLarge.success);
  } catch (err: any) {
    assert("SCORM 2004 suspend data capacity verification threw error", false, err.message);
  }

  // 5. Interaction recording validation
  try {
    const interactionValid = scormInteractionSchema.safeParse({
      id: "q-module-01-assessment",
      type: "choice",
      timestamp: "2026-11-20T12:00:00Z",
      weighting: 1.0,
      learner_response: "opt_b",
      result: "correct",
      latency: "PT15S",
      description: "Identify chemical PPE requirements",
    });
    assert("SCORM 2004 validates cmi.interactions payload correctly", interactionValid.success);
  } catch (err: any) {
    assert("SCORM 2004 interaction schema threw error", false, err.message);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { passed, failed, results };
}
