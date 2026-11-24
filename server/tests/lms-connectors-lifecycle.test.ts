import {
  createLMSConnectionSchema,
  createLMSDeploymentSchema,
  lmsGradePushSchema,
} from "../src/modules/lms/lms.schema.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runLmsConnectorsLifecycleTests(): Promise<{ passed: number; failed: number; results: TestResult[] }> {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: message || "Assertion failed" });
    }
  }

  // 1. LMS Connection Schema Validation
  try {
    const validCanvas = createLMSConnectionSchema.safeParse({
      workspaceId: "11111111-1111-4111-a111-111111111111",
      platformCode: "CANVAS",
      name: "Canvas Production Instance",
      apiBaseUrl: "https://canvas.institution.edu",
      authType: "OAUTH2",
      credentials: {
        clientId: "canvas_oauth_123",
        clientSecret: "sec_9941_abc",
        authUrl: "https://canvas.institution.edu/login/oauth2/auth",
        tokenUrl: "https://canvas.institution.edu/login/oauth2/token",
      },
    });
    assert("createLMSConnectionSchema accepts valid Canvas OAuth2 config", validCanvas.success);

    const validMoodle = createLMSConnectionSchema.safeParse({
      workspaceId: "11111111-1111-4111-a111-111111111111",
      platformCode: "MOODLE",
      name: "Moodle Cloud Portal",
      apiBaseUrl: "https://moodle.institution.edu",
      authType: "API_KEY",
      credentials: {
        apiKey: "moodle_webservice_token_99281726",
      },
    });
    assert("createLMSConnectionSchema accepts valid Moodle REST API config", validMoodle.success);

    const validBlackboard = createLMSConnectionSchema.safeParse({
      workspaceId: "11111111-1111-4111-a111-111111111111",
      platformCode: "BLACKBOARD",
      name: "Blackboard Learn LTI 1.3",
      authType: "LTI_13",
      credentials: {
        clientId: "bb_client_001",
        deploymentId: "dep_bb_01",
        iss: "https://blackboard.com",
        jwksUrl: "https://developer.anthology.com/api/v1/management/applications/jwks.json",
      },
    });
    assert("createLMSConnectionSchema accepts valid Blackboard LTI 1.3 config", validBlackboard.success);
  } catch (err: any) {
    assert("LMS connection schema validation threw error", false, err.message);
  }

  // 2. LMS Deployment Schema Validation
  try {
    const validDeployment = createLMSDeploymentSchema.safeParse({
      lmsConnectionId: "11111111-1111-4111-a111-111111111111",
      courseId: "22222222-2222-4222-a222-222222222222",
      externalCourseId: "canvas_course_9012",
      externalActivityId: "canvas_mod_item_5432",
      title: "Workplace Hazard Communication Module",
    });
    assert("createLMSDeploymentSchema accepts valid course deployment payload", validDeployment.success);

    const validScormDeployment = createLMSDeploymentSchema.safeParse({
      lmsConnectionId: "11111111-1111-4111-a111-111111111111",
      scormPackageId: "33333333-3333-4333-a333-333333333333",
      externalCourseId: "moodle_course_401",
      title: "SCORM 2004 Interactive Quiz Package",
    });
    assert("createLMSDeploymentSchema accepts valid SCORM package deployment", validScormDeployment.success);
  } catch (err: any) {
    assert("LMS deployment schema validation threw error", false, err.message);
  }

  // 3. LTI Assignment & Grade Services (AGS) Schema Validation
  try {
    const validGradePush = lmsGradePushSchema.safeParse({
      deploymentId: "11111111-1111-4111-a111-111111111111",
      learnerId: "22222222-2222-4222-a222-222222222222",
      scoreGiven: 92.5,
      scoreMaximum: 100,
      activityProgress: "Completed",
      gradingProgress: "FullyGraded",
      comment: "Passed laboratory PPE evaluation",
    });
    assert("lmsGradePushSchema accepts valid grade payload", validGradePush.success);

    const invalidGradeNegative = lmsGradePushSchema.safeParse({
      deploymentId: "11111111-1111-4111-a111-111111111111",
      learnerId: "22222222-2222-4222-a222-222222222222",
      scoreGiven: -10,
    });
    assert("lmsGradePushSchema rejects negative scoreGiven", !invalidGradeNegative.success);
  } catch (err: any) {
    assert("LMS grade push schema validation threw error", false, err.message);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { passed, failed, results };
}
