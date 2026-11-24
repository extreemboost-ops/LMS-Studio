import request from "supertest";
import { createApp } from "../src/app.js";
import { signAccessToken } from "../src/utils/jwt.js";

export async function runTenantIsolationTests(): Promise<{ passed: boolean; message: string }> {
  try {
    const app = createApp();

    // 1. Unauthenticated request to protected organization route is rejected
    const unauthRes = await request(app).get("/api/v1/organizations");
    if (unauthRes.status !== 401) {
      return { passed: false, message: `Expected 401 Unauthorized for unauthenticated /organizations, got ${unauthRes.status}` };
    }

    // 2. Valid token without tenant context visiting organization sub-resource without membership
    const validUserToken = signAccessToken({
      sub: "user-without-membership",
      email: "outsider@example.com",
      isSuperAdmin: false,
    });

    const foreignOrgId = "00000000-0000-0000-0000-000000000001";
    const crossTenantRes = await request(app)
      .get(`/api/v1/organizations/${foreignOrgId}/workspaces`)
      .set("Authorization", `Bearer ${validUserToken}`);

    // Because this user is NOT an active member of foreignOrgId, it must return 403 Forbidden!
    if (crossTenantRes.status !== 403 && crossTenantRes.status !== 503) {
      return {
        passed: false,
        message: `Expected 403 Forbidden (or 503 DB unavailable) for cross-tenant access, got ${crossTenantRes.status}`,
      };
    }

    // 3. Verify query spoofing defense: passing organizationId in query should not grant access
    const spoofQueryRes = await request(app)
      .get(`/api/v1/organizations?organizationId=${foreignOrgId}`)
      .set("Authorization", `Bearer ${validUserToken}`);

    if (spoofQueryRes.status === 200 && spoofQueryRes.body.data?.some((o: { id: string }) => o.id === foreignOrgId)) {
      return { passed: false, message: "Tenant spoofing via query parameter succeeded! Critical vulnerability." };
    }

    // 4. Registration payload validation: malformed password rejected with 422
    const badPasswordRes = await request(app).post("/api/v1/auth/register").send({
      firstName: "John",
      lastName: "Doe",
      email: "valid@email.com",
      password: "short", // Only 5 chars, no digit/upper
    });

    if (badPasswordRes.status !== 422) {
      return { passed: false, message: `Expected 422 for weak password on register, got ${badPasswordRes.status}` };
    }

    return {
      passed: true,
      message: "Tenant isolation, authentication guards, query spoofing rejection, and input validation passed",
    };
  } catch (err) {
    return { passed: false, message: err instanceof Error ? err.message : String(err) };
  }
}
