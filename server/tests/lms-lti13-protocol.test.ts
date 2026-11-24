import { LMSLtiService } from "../src/modules/lms/lms-lti.service.js";
import { LMSCryptoService } from "../src/modules/lms/lms-crypto.service.js";
import { ltiLoginInitiationSchema, ltiLaunchSchema } from "../src/modules/lms/lms.schema.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runLmsLti13ProtocolTests(): Promise<{ passed: number; failed: number; results: TestResult[] }> {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: message || "Assertion failed" });
    }
  }

  // 1. OIDC Login Initiation Test
  try {
    const initInput = {
      iss: "https://canvas.instructure.com",
      login_hint: "learner_user_99281",
      target_link_uri: "https://studio.local/lti/1.3/launch",
      client_id: "10000000000001",
      lti_message_hint: "hint_course_102",
      lti_deployment_id: "dep_9941",
    };

    const validInit = ltiLoginInitiationSchema.safeParse(initInput);
    assert("LTI 1.3 login initiation schema accepts valid parameters", validInit.success);

    const initResult = LMSLtiService.handleLoginInitiation(initInput, "https://canvas.instructure.com/api/lti/authorize_redirect");
    assert("LTI 1.3 initiation generates redirectUrl", Boolean(initResult.redirectUrl));
    assert("LTI 1.3 initiation generates cryptographic state", initResult.state.startsWith("state_"));
    assert("LTI 1.3 initiation generates cryptographic nonce", initResult.nonce.startsWith("nonce_"));

    const parsedUrl = new URL(initResult.redirectUrl);
    assert("LTI 1.3 redirect includes response_type=id_token", parsedUrl.searchParams.get("response_type") === "id_token");
    assert("LTI 1.3 redirect includes scope=openid", parsedUrl.searchParams.get("scope") === "openid");
    assert("LTI 1.3 redirect includes client_id", parsedUrl.searchParams.get("client_id") === "10000000000001");
    assert("LTI 1.3 redirect includes login_hint", parsedUrl.searchParams.get("login_hint") === "learner_user_99281");
  } catch (err: any) {
    assert("LTI 1.3 OIDC login initiation threw error", false, err.message);
  }

  // 2. LTI 1.3 JWT Token Parsing & Claims Extraction
  try {
    const mockClaims = {
      iss: "https://canvas.instructure.com",
      sub: "canvas_user_88219",
      aud: ["10000000000001"],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      nonce: "nonce_test_123",
      name: "Jane Doe",
      email: "jane.doe@university.edu",
      "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
      "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
      "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "dep_canvas_01",
      "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": "https://studio.local/lti/1.3/launch",
      "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
        id: "res_link_module_04",
        title: "Workplace Safety & Chemical Hazards",
      },
      "https://purl.imsglobal.org/spec/lti/claim/roles": [
        "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student",
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner",
      ],
      "https://purl.imsglobal.org/spec/lti/claim/context": {
        id: "canvas_course_301",
        title: "Occupational Safety 101",
      },
    };

    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "key-1" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify(mockClaims)).toString("base64url");
    const signature = "dummy_signature_bytes_abc123";
    const rawIdToken = `${header}.${payload}.${signature}`;

    const launchValidation = ltiLaunchSchema.safeParse({ id_token: rawIdToken, state: "state_1234567890abcdef" });
    assert("LTI 1.3 launch schema validates id_token and state", launchValidation.success);

    const parsedContext = LMSLtiService.parseLtiToken(rawIdToken);
    assert("LTI 1.3 extracts learner sub user ID", parsedContext.userId === "canvas_user_88219");
    assert("LTI 1.3 extracts learner email", parsedContext.email === "jane.doe@university.edu");
    assert("LTI 1.3 extracts full name", parsedContext.fullName === "Jane Doe");
    assert("LTI 1.3 detects student role (isInstructor = false)", parsedContext.isInstructor === false);
    assert("LTI 1.3 extracts resource link ID", parsedContext.resourceLinkId === "res_link_module_04");
    assert("LTI 1.3 extracts context course ID", parsedContext.contextId === "canvas_course_301");
  } catch (err: any) {
    assert("LTI 1.3 token parsing test threw error", false, err.message);
  }

  // 3. Instructor Role Detection
  try {
    const instructorClaims = {
      sub: "instructor_99",
      name: "Dr. Alan Grant",
      email: "grant@university.edu",
      "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
      "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
      "https://purl.imsglobal.org/spec/lti/claim/roles": [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor",
      ],
    };

    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify(instructorClaims)).toString("base64url");
    const token = `${header}.${payload}.sig`;

    const ctx = LMSLtiService.parseLtiToken(token);
    assert("LTI 1.3 detects instructor role (isInstructor = true)", ctx.isInstructor === true);
  } catch (err: any) {
    assert("LTI 1.3 instructor role test threw error", false, err.message);
  }

  // 4. Public JWKS RSA Keyset Test
  try {
    const jwks = LMSCryptoService.getPublicJWKS();
    assert("Public JWKS delivers keys array", Array.isArray(jwks.keys) && jwks.keys.length > 0);
    assert("Public JWKS key uses RSA kty", jwks.keys[0].kty === "RSA");
    assert("Public JWKS key uses sig use", jwks.keys[0].use === "sig");
    assert("Public JWKS key uses RS256 alg", jwks.keys[0].alg === "RS256");
    assert("Public JWKS key provides modulus n and exponent e", Boolean(jwks.keys[0].n && jwks.keys[0].e));
  } catch (err: any) {
    assert("Public JWKS test threw error", false, err.message);
  }

  // 5. Malformed Token Rejection
  try {
    let rejected = false;
    try {
      LMSLtiService.parseLtiToken("not.a.valid.jwt");
    } catch {
      rejected = true;
    }
    assert("LTI 1.3 rejects invalid or corrupted tokens", rejected);
  } catch (err: any) {
    assert("Malformed token rejection threw error", false, err.message);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { passed, failed, results };
}
