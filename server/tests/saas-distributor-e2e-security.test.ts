/**
 * Phase 08.6: Final SaaS & Distributor Security Test Gate
 * Suite 34: End-to-End Commercialization Security Gate (Entitlements, Webhooks, Licenses, RLS, White-Label, Super Admin)
 */

import crypto from "node:crypto";
import request from "supertest";
import { createApp } from "../src/app.js";
import { signAccessToken } from "../src/utils/jwt.js";
import { EntitlementsService } from "../src/modules/billing/entitlements.service.js";
import { LicenseService } from "../src/modules/billing/license.service.js";
import { StripeService } from "../src/modules/billing/stripe.service.js";
import { DistributorService } from "../src/modules/distributor/distributor.service.js";
import { BrandingService } from "../src/modules/distributor/branding.service.js";
import { resolveDistributorContext } from "../src/middlewares/distributorContext.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runSaasDistributorE2ESecurityTests(): Promise<{
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

  // 1. Entitlements & Quota Gate
  try {
    const expiredTrial = new Date(Date.now() - 60_000);
    assert(
      "Gate 1: Expired TRIALING subscription is denied active access",
      !EntitlementsService.isSubscriptionActive("TRIALING", expiredTrial)
    );
    assert(
      "Gate 1: Seat quota enforces hard cap at limit (3/3)",
      !EntitlementsService.evaluateQuota(3, 3).allowed
    );
  } catch (err: any) {
    assert("Gate 1 crashed", false, err.message);
  }

  // 2. Stripe Webhook Forgery & Replay Gate
  try {
    const secret = "whsec_gate_08_6_secret";
    const body = JSON.stringify({ id: "evt_gate_1", type: "checkout.session.completed", data: { object: {} } });
    const ts = Math.floor(Date.now() / 1000);
    const sig = crypto.createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");

    const ok = StripeService.verifyWebhookSignature(body, `t=${ts},v1=${sig}`, secret);
    assert("Gate 2: Valid Stripe webhook signature accepted", ok.id === "evt_gate_1");

    let forgedRejected = false;
    try {
      StripeService.verifyWebhookSignature(body, `t=${ts},v1=${"f".repeat(64)}`, secret);
    } catch {
      forgedRejected = true;
    }
    assert("Gate 2: Forged Stripe webhook signature rejected", forgedRejected);
  } catch (err: any) {
    assert("Gate 2 crashed", false, err.message);
  }

  // 3. License Key Hashing & Commission Math Gate
  try {
    const rawKey = LicenseService.formatLicenseKey("enterprise");
    const hash = LicenseService.hashLicenseCode(rawKey);
    assert(
      "Gate 3: License key is SHA-256 hashed (never stored raw) and matches format",
      hash.length === 64 && !hash.includes(rawKey) && rawKey.startsWith("LMS-ENTE-")
    );
    assert(
      "Gate 3: Commission math computes exact integer cents (25% of $499.00 = 12475)",
      DistributorService.calculateCommissionCents(49900, 25) === 12475
    );
  } catch (err: any) {
    assert("Gate 3 crashed", false, err.message);
  }

  // 4. Distributor Query Spoofing & White-Label Host Injection Gate
  try {
    const fakeReq: any = {
      query: { distributorId: "99999999-9999-4999-a999-999999999999" },
      headers: {},
      user: undefined,
    };
    let unauthBlocked = false;
    await resolveDistributorContext(fakeReq, {} as any, (err?: any) => {
      if (err && err.statusCode === 401) unauthBlocked = true;
    });
    assert(
      "Gate 4: resolveDistributorContext strips query.distributorId spoofing and rejects unauthenticated requests",
      !("distributorId" in fakeReq.query) && unauthBlocked
    );

    assert(
      "Gate 4: Host-header injection & reserved domains are rejected",
      BrandingService.normalizeDomainHost("attacker.com/admin") === "attacker.com" &&
        BrandingService.normalizeDomainHost("evil.com@victim.com") === null &&
        BrandingService.isReservedDomain("evil.vercel.app")
    );
  } catch (err: any) {
    assert("Gate 4 crashed", false, err.message);
  }

  // 5. Super Admin & Tenant Endpoint Guard Gate
  try {
    const app = createApp();
    const nonAdminToken = signAccessToken({
      sub: "22222222-2222-4222-a222-222222222222",
      email: "partner@apex.io",
      isSuperAdmin: false,
    });

    const [genRes, overviewRes, payoutRes, publicBrandRes] = await Promise.all([
      request(app)
        .post("/api/v1/billing/licenses/generate")
        .set("Authorization", `Bearer ${nonAdminToken}`)
        .send({ planCode: "enterprise", count: 1, seatCount: 50, durationDays: 365 }),
      request(app)
        .get("/api/v1/admin/distributors/overview")
        .set("Authorization", `Bearer ${nonAdminToken}`),
      request(app)
        .patch("/api/v1/admin/distributors/payouts/11111111-1111-4111-a111-111111111111")
        .set("Authorization", `Bearer ${nonAdminToken}`)
        .send({ status: "PAID" }),
      request(app).get("/api/v1/public/branding"),
    ]);

    assert("Gate 5: Non-SuperAdmin blocked from license generation (403)", genRes.status === 403);
    assert("Gate 5: Non-SuperAdmin blocked from SaaS Command overview (403)", overviewRes.status === 403);
    assert("Gate 5: Non-SuperAdmin blocked from payout settlement (403)", payoutRes.status === 403);
    assert("Gate 5: Public branding endpoint returns 200 safely", publicBrandRes.status === 200);
  } catch (err: any) {
    assert("Gate 5 crashed", false, err.message);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { passed, failed, results };
}
