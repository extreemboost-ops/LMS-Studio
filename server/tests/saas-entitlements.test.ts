/**
 * Phase 08.1: SaaS Plans, Entitlements & Quota Engine Verification
 * Suite 30: Plans Catalog, Quota Boundary Math, Trial Lifecycle, Feature Flags & HTTP Endpoints
 */

import request from "supertest";
import { createApp } from "../src/app.js";
import { signAccessToken } from "../src/utils/jwt.js";
import {
  DEFAULT_SAAS_PLANS,
  getDefaultPlanDefinition,
} from "../src/modules/billing/plans.catalog.js";
import { EntitlementsService } from "../src/modules/billing/entitlements.service.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runSaasEntitlementsTests(): Promise<{
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

  // 1. Default SaaS Plan Catalog Integrity
  try {
    const codes = DEFAULT_SAAS_PLANS.map((p) => p.code);
    assert(
      "Plan catalog includes trial, starter, pro, business, and enterprise",
      ["trial", "starter", "pro", "business", "enterprise"].every((c) => codes.includes(c as any))
    );

    const trial = getDefaultPlanDefinition("trial");
    const enterprise = getDefaultPlanDefinition("enterprise");
    assert(
      "Trial plan is non-public with 3 seats, 1 workspace, and LTI disabled",
      !trial.isPublic && trial.maxSeats === 3 && trial.maxWorkspaces === 1 && !trial.features.lti13
    );
    assert(
      "Enterprise plan supports unlimited (-1) seats, workspaces, and exports with whiteLabel",
      enterprise.maxSeats === -1 &&
        enterprise.maxWorkspaces === -1 &&
        enterprise.maxMonthlyExports === -1 &&
        enterprise.features.whiteLabel
    );
  } catch (err: any) {
    assert("Plan catalog integrity crashed", false, err.message);
  }

  // 2. Quota Evaluation Boundary Math
  try {
    const underLimit = EntitlementsService.evaluateQuota(4, 5);
    assert(
      "evaluateQuota allows usage strictly below limit (4/5 -> remaining 1)",
      underLimit.allowed && underLimit.remaining === 1
    );

    const atLimit = EntitlementsService.evaluateQuota(5, 5);
    assert(
      "evaluateQuota blocks usage at limit (5/5 -> remaining 0)",
      !atLimit.allowed && atLimit.remaining === 0
    );

    const overLimit = EntitlementsService.evaluateQuota(7, 5);
    assert(
      "evaluateQuota blocks usage above limit (7/5 -> remaining 0)",
      !overLimit.allowed && overLimit.remaining === 0
    );

    const unlimited = EntitlementsService.evaluateQuota(99999, -1);
    assert(
      "evaluateQuota treats -1 as unlimited",
      unlimited.allowed && unlimited.limit === -1 && unlimited.remaining === -1
    );
  } catch (err: any) {
    assert("Quota boundary math crashed", false, err.message);
  }

  // 3. Subscription Status & Trial Expiry Evaluation
  try {
    const now = new Date("2026-11-25T00:00:00Z");
    const future = new Date("2026-12-09T00:00:00Z");
    const past = new Date("2026-11-20T00:00:00Z");

    assert(
      "ACTIVE subscription is permitted",
      EntitlementsService.isSubscriptionActive("ACTIVE", null, now)
    );
    assert(
      "TRIALING subscription with future trialEndsAt is permitted",
      EntitlementsService.isSubscriptionActive("TRIALING", future, now)
    );
    assert(
      "TRIALING subscription with expired trialEndsAt is blocked",
      !EntitlementsService.isSubscriptionActive("TRIALING", past, now)
    );
    assert(
      "SUSPENDED, PAST_DUE, and CANCELLED subscriptions are blocked",
      !EntitlementsService.isSubscriptionActive("SUSPENDED", future, now) &&
        !EntitlementsService.isSubscriptionActive("PAST_DUE", future, now) &&
        !EntitlementsService.isSubscriptionActive("CANCELLED", future, now)
    );

    const periodKey = EntitlementsService.getCurrentPeriodKey(now);
    assert("Period key formats as YYYY-MM in UTC", periodKey === "2026-11");
  } catch (err: any) {
    assert("Subscription status evaluation crashed", false, err.message);
  }

  // 4. Billing HTTP Endpoints (Public Plans + Auth Guard on Org Entitlements)
  try {
    const app = createApp();

    const publicRes = await request(app).get("/api/v1/billing/plans");
    assert(
      "GET /api/v1/billing/plans returns 200 with public plans",
      publicRes.status === 200 &&
        publicRes.body.success === true &&
        Array.isArray(publicRes.body.data?.plans) &&
        publicRes.body.data.plans.length >= 4 &&
        !publicRes.body.data.plans.some((p: any) => p.code === "trial")
    );

    const orgId = "11111111-1111-4111-a111-111111111111";
    const unauthRes = await request(app).get(`/api/v1/organizations/${orgId}/billing/entitlements`);
    assert(
      "GET /organizations/:id/billing/entitlements rejects unauthenticated requests with 401",
      unauthRes.status === 401
    );

    const token = signAccessToken({
      sub: "22222222-2222-4222-a222-222222222222",
      email: "owner@studio.local",
      isSuperAdmin: false,
      orgId,
      role: "OWNER",
    });
    assert("JWT issued cleanly for billing verification", token.split(".").length === 3);
  } catch (err: any) {
    assert("Billing HTTP endpoint checks crashed", false, err.message);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { passed, failed, results };
}
