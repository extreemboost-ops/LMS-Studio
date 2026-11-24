import request from "supertest";
import { createApp } from "../src/app.js";

export async function runHealthAndRouteTests(): Promise<{ passed: boolean; message: string }> {
  try {
    const app = createApp();

    // Test 1: GET /api/v1/health
    const healthRes = await request(app).get("/api/v1/health");
    if (healthRes.status !== 200) {
      return { passed: false, message: `Expected status 200 on /api/v1/health, got ${healthRes.status}` };
    }
    if (!healthRes.body.success || healthRes.body.data.status !== "OK") {
      return { passed: false, message: "Expected success: true and status: 'OK' on /api/v1/health" };
    }
    if (!healthRes.headers["x-request-id"]) {
      return { passed: false, message: "Expected X-Request-Id header in response" };
    }

    // Test 2: Custom X-Request-Id propagation
    const customId = "test-custom-request-id-12345";
    const customIdRes = await request(app)
      .get("/api/v1/health")
      .set("X-Request-Id", customId);

    if (customIdRes.headers["x-request-id"] !== customId) {
      return {
        passed: false,
        message: `Expected X-Request-Id to be preserved as ${customId}, got ${customIdRes.headers["x-request-id"]}`,
      };
    }

    // Test 3: GET /api/v1/health/database
    // Real check: either 200 (database UP) or 503 (database DOWN)
    const dbRes = await request(app).get("/api/v1/health/database");
    if (dbRes.status !== 200 && dbRes.status !== 503) {
      return { passed: false, message: `Expected 200 or 503 on /api/v1/health/database, got ${dbRes.status}` };
    }
    if (!dbRes.body.data || !dbRes.body.data.status) {
      return { passed: false, message: "Expected database status in response data" };
    }

    // Test 4: GET /api/v1/health/readiness
    const readyRes = await request(app).get("/api/v1/health/readiness");
    if (readyRes.status !== 200 && readyRes.status !== 503) {
      return { passed: false, message: `Expected 200 or 503 on /api/v1/health/readiness, got ${readyRes.status}` };
    }

    // Test 5: Unknown route 404 handling
    const notFoundRes = await request(app).get("/api/v1/non-existent-endpoint-test");
    if (notFoundRes.status !== 404) {
      return { passed: false, message: `Expected 404 on unknown route, got ${notFoundRes.status}` };
    }
    if (notFoundRes.body.success !== false || notFoundRes.body.error?.code !== "NOT_FOUND") {
      return { passed: false, message: "Expected standardized NOT_FOUND error response" };
    }

    return {
      passed: true,
      message: "Health endpoints, request ID propagation, and 404 error handling passed",
    };
  } catch (error) {
    return { passed: false, message: error instanceof Error ? error.message : String(error) };
  }
}
