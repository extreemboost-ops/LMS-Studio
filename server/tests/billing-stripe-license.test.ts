/**
 * Phase 08.2: Stripe Billing, Webhook Signature Verification & B2B License Key Engine
 * Suite 31: License Key Formatting/Hashing, Stripe HMAC Signature & Replay Defense, Endpoint Guards
 */

import crypto from "node:crypto";
import request from "supertest";
import { createApp } from "../src/app.js";
import { signAccessToken } from "../src/utils/jwt.js";
import { LicenseService } from "../src/modules/billing/license.service.js";
import { StripeService } from "../src/modules/billing/stripe.service.js";
import {
  createCheckoutSchema,
  generateLicenseKeysSchema,
  redeemLicenseKeySchema,
} from "../src/modules/billing/billing.schema.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runBillingStripeLicenseTests(): Promise<{
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

  // 1. License Key Formatting & Deterministic Normalization Hashing
  try {
    const key1 = LicenseService.formatLicenseKey("pro");
    const key2 = LicenseService.formatLicenseKey("pro");
    assert(
      "License key matches LMS-PRO-XXXX-XXXX-XXXX pattern",
      /^LMS-PRO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key1)
    );
    assert("Generated license keys are unique", key1 !== key2);

    const hashUpper = LicenseService.hashLicenseCode(key1);
    const hashLowerTrimmed = LicenseService.hashLicenseCode(`  ${key1.toLowerCase()}  `);
    assert(
      "License code hashing normalizes whitespace and casing deterministically",
      hashUpper.length === 64 && hashUpper === hashLowerTrimmed
    );
  } catch (err: any) {
    assert("License key formatting/hashing crashed", false, err.message);
  }

  // 2. Billing Zod Schemas Validation
  try {
    const validCheckout = createCheckoutSchema.safeParse({
      planCode: "pro",
      billingCycle: "ANNUAL",
    });
    const badCheckout = createCheckoutSchema.safeParse({
      planCode: "trial",
      billingCycle: "MONTHLY",
    });
    assert("createCheckoutSchema accepts valid paid plan", validCheckout.success);
    assert("createCheckoutSchema rejects trial plan checkout", !badCheckout.success);

    const validGen = generateLicenseKeysSchema.safeParse({
      planCode: "business",
      count: 10,
      seatCount: 50,
      durationDays: 365,
    });
    assert("generateLicenseKeysSchema accepts valid batch parameters", validGen.success);

    const badRedeem = redeemLicenseKeySchema.safeParse({ code: "short" });
    assert("redeemLicenseKeySchema rejects short invalid codes", !badRedeem.success);
  } catch (err: any) {
    assert("Billing Zod validation crashed", false, err.message);
  }

  // 3. Stripe Webhook HMAC-SHA256 Signature & Replay Defense
  try {
    const webhookSecret = "whsec_test_secret_1234567890abcdef";
    const payloadObj = {
      id: "evt_test_001",
      type: "checkout.session.completed",
      data: { object: { metadata: { organizationId: "org-1", planCode: "pro" } } },
    };
    const rawPayload = JSON.stringify(payloadObj);
    const nowTs = Math.floor(Date.now() / 1000);

    const validSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(`${nowTs}.${rawPayload}`, "utf8")
      .digest("hex");

    const verified = StripeService.verifyWebhookSignature(
      rawPayload,
      `t=${nowTs},v1=${validSig}`,
      webhookSecret
    );
    assert(
      "StripeService verifies valid HMAC-SHA256 webhook signature",
      verified.id === "evt_test_001" && verified.type === "checkout.session.completed"
    );

    // Tampered signature rejection
    let rejectedTamper = false;
    try {
      StripeService.verifyWebhookSignature(
        rawPayload,
        `t=${nowTs},v1=${"0".repeat(64)}`,
        webhookSecret
      );
    } catch {
      rejectedTamper = true;
    }
    assert("StripeService rejects forged webhook signature", rejectedTamper);

    // Expired timestamp replay rejection (> 300s)
    const staleTs = nowTs - 900;
    const staleSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(`${staleTs}.${rawPayload}`, "utf8")
      .digest("hex");
    let rejectedReplay = false;
    try {
      StripeService.verifyWebhookSignature(
        rawPayload,
        `t=${staleTs},v1=${staleSig}`,
        webhookSecret
      );
    } catch {
      rejectedReplay = true;
    }
    assert("StripeService rejects stale timestamp replay attack", rejectedReplay);
  } catch (err: any) {
    assert("Stripe webhook verification crashed", false, err.message);
  }

  // 4. Endpoint Authorization & Super Admin Guard Checks
  try {
    const app = createApp();

    // Non-super-admin cannot generate platform license keys
    const regularToken = signAccessToken({
      sub: "22222222-2222-4222-a222-222222222222",
      email: "author@studio.local",
      isSuperAdmin: false,
      orgId: "11111111-1111-4111-a111-111111111111",
      role: "OWNER",
    });

    const genDenied = await request(app)
      .post("/api/v1/billing/licenses/generate")
      .set("Authorization", `Bearer ${regularToken}`)
      .send({ planCode: "pro", count: 1, seatCount: 10, durationDays: 365 });

    assert(
      "POST /api/v1/billing/licenses/generate rejects non-SuperAdmin with 403",
      genDenied.status === 403
    );

    const listDenied = await request(app)
      .get("/api/v1/billing/licenses")
      .set("Authorization", `Bearer ${regularToken}`);

    assert(
      "GET /api/v1/billing/licenses rejects non-SuperAdmin with 403",
      listDenied.status === 403
    );

    const webhookUnauth = await request(app)
      .post("/api/v1/billing/webhooks/stripe")
      .send({ id: "evt_fake" });
    assert(
      "POST /api/v1/billing/webhooks/stripe rejects missing signature/secret",
      webhookUnauth.status === 401 || webhookUnauth.status === 503
    );
  } catch (err: any) {
    assert("Billing endpoint guard checks crashed", false, err.message);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { passed, failed, results };
}
