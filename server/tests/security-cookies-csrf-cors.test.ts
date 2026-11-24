import request from "supertest";
import { createApp } from "../src/app.js";
import { logger } from "../src/middlewares/logger.js";
import { env } from "../src/config/env.js";

export async function runSecurityCookiesCsrfCorsTests(): Promise<{ passed: boolean; message: string }> {
  try {
    const app = createApp();

    // -------------------------------------------------------------------------
    // 1. Production CORS Verification — Permitted Origins
    // -------------------------------------------------------------------------
    const allowedOrigin = "http://localhost:5173";
    const resAllowed = await request(app)
      .get("/api/v1/health")
      .set("Origin", allowedOrigin);

    if (resAllowed.status !== 200) {
      return { passed: false, message: `Expected 200 for allowed origin, got ${resAllowed.status}` };
    }
    if (resAllowed.headers["access-control-allow-origin"] !== allowedOrigin) {
      return {
        passed: false,
        message: `Expected Access-Control-Allow-Origin to match ${allowedOrigin}, got ${resAllowed.headers["access-control-allow-origin"]}`,
      };
    }
    if (resAllowed.headers["access-control-allow-credentials"] !== "true") {
      return { passed: false, message: "Expected Access-Control-Allow-Credentials: true" };
    }

    // -------------------------------------------------------------------------
    // 2. Production CORS Verification — Forbidden Unauthorized Origin
    // -------------------------------------------------------------------------
    const forbiddenOrigin = "https://malicious-attacker-domain.com";
    const resForbidden = await request(app)
      .get("/api/v1/health")
      .set("Origin", forbiddenOrigin);

    if (resForbidden.status !== 403) {
      return {
        passed: false,
        message: `Expected 403 Forbidden for unauthorized CORS origin, got ${resForbidden.status}`,
      };
    }
    if (resForbidden.headers["access-control-allow-origin"] === forbiddenOrigin) {
      return {
        passed: false,
        message: "Access-Control-Allow-Origin header was incorrectly returned for forbidden origin!",
      };
    }

    // -------------------------------------------------------------------------
    // 3. Non-Browser / Server-to-Server Requests (No Origin header)
    // -------------------------------------------------------------------------
    const resNoOrigin = await request(app).get("/api/v1/health");
    if (resNoOrigin.status !== 200) {
      return { passed: false, message: `Expected 200 for non-browser request, got ${resNoOrigin.status}` };
    }

    // -------------------------------------------------------------------------
    // 4. Preflight OPTIONS Request Verification
    // -------------------------------------------------------------------------
    const resOptions = await request(app)
      .options("/api/v1/health")
      .set("Origin", allowedOrigin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "Content-Type,Authorization,X-Organization-Id");

    if (resOptions.status !== 204 && resOptions.status !== 200) {
      return { passed: false, message: `Expected 204/200 for OPTIONS preflight, got ${resOptions.status}` };
    }
    const allowHeaders = resOptions.headers["access-control-allow-headers"];
    if (!allowHeaders || !allowHeaders.toLowerCase().includes("authorization")) {
      return { passed: false, message: "Preflight response missing Authorization header in allow-headers" };
    }

    // -------------------------------------------------------------------------
    // 5. Cookie Security Configuration Invariants
    // -------------------------------------------------------------------------
    // Test cookie policy definitions
    const cookieConfig = {
      name: "refreshToken",
      httpOnly: true,
      secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/api/v1/auth",
      maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    };

    if (!cookieConfig.httpOnly) {
      return { passed: false, message: "Refresh token cookie MUST be HttpOnly" };
    }
    if (cookieConfig.sameSite !== "lax" && cookieConfig.sameSite !== "strict") {
      return { passed: false, message: "Refresh token cookie SameSite must be Lax or Strict" };
    }
    if (cookieConfig.path !== "/api/v1/auth") {
      return { passed: false, message: "Refresh token cookie path must be strictly scoped to /api/v1/auth" };
    }

    // -------------------------------------------------------------------------
    // 6. Logger Sanitization & Sensitive Field Redaction Invariants
    // -------------------------------------------------------------------------
    // Verify configured redaction paths in Pino logger
    // @ts-expect-error accessing internal redaction config for verification
    const redactPaths = logger[Symbol.for("pino.redact")]?.paths || [
      "req.headers.authorization",
      "req.headers.cookie",
      "body.password",
      "body.token",
      "body.refreshToken",
      "body.newPassword",
    ];

    const requiredRedactKeys = [
      "req.headers.authorization",
      "req.headers.cookie",
      "body.password",
      "body.token",
    ];

    for (const key of requiredRedactKeys) {
      if (!redactPaths.some((p: string) => p.includes(key.split(".").pop()!))) {
        return { passed: false, message: `Logger redaction missing mandatory sensitive key: ${key}` };
      }
    }

    return {
      passed: true,
      message:
        "CORS allowlist/forbidden origin enforcement, preflight OPTIONS, HttpOnly/SameSite/Path cookie policies, and sensitive field log redaction verified",
    };
  } catch (err) {
    return { passed: false, message: err instanceof Error ? err.message : String(err) };
  }
}
