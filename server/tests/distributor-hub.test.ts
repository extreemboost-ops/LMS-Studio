/**
 * Phase 08.3: Distributor Hub Backend, Client Provisioning & Cross-Distributor RLS
 * Suite 32: Schemas, Commission Math, RLS Isolation Invariants, Role Guards & Admin Controls
 */

import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { createApp } from "../src/app.js";
import { signAccessToken } from "../src/utils/jwt.js";
import { DistributorService } from "../src/modules/distributor/distributor.service.js";
import {
  applyDistributorSchema,
  provisionClientSchema,
  requestPayoutSchema,
} from "../src/modules/distributor/distributor.schema.js";
import { requireDistributorRole } from "../src/middlewares/distributorContext.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runDistributorHubTests(): Promise<{
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

  // 1. Commission Financial Math
  try {
    assert(
      "25% commission on $79.00 (7900 cents) calculates 1975 cents",
      DistributorService.calculateCommissionCents(7900, 25) === 1975
    );
    assert(
      "30% commission on $199.00 (19900 cents) calculates 5970 cents",
      DistributorService.calculateCommissionCents(19900, 30) === 5970
    );
    assert(
      "Zero or negative gross amounts yield 0 commission",
      DistributorService.calculateCommissionCents(0, 25) === 0 &&
        DistributorService.calculateCommissionCents(-100, 25) === 0
    );
  } catch (err: any) {
    assert("Commission math crashed", false, err.message);
  }

  // 2. Distributor Zod Validation Schemas
  try {
    const validApply = applyDistributorSchema.safeParse({
      name: "Apex EdTech Partners",
      contactEmail: "partners@apexedtech.io",
      companyWebsite: "https://apexedtech.io",
      billingMode: "REV_SHARE",
    });
    assert("applyDistributorSchema accepts valid partner application", validApply.success);

    const validClient = provisionClientSchema.safeParse({
      organizationName: "Lincoln University",
      ownerEmail: "dean@lincoln.edu",
      planCode: "pro",
      seatCount: 50,
      durationDays: 365,
    });
    assert("provisionClientSchema accepts valid client provisioning input", validClient.success);

    const badPayout = requestPayoutSchema.safeParse({ amountCents: 500 });
    assert("requestPayoutSchema enforces $10.00 minimum payout (1000 cents)", !badPayout.success);
  } catch (err: any) {
    assert("Distributor schema validation crashed", false, err.message);
  }

  // 3. Cross-Distributor RLS SQL & Parameterized set_config Verification
  try {
    const rlsPath = path.resolve(process.cwd(), "server/src/database/rls.ts");
    const rlsSrc = fs.readFileSync(rlsPath, "utf8");
    assert(
      "rls.ts defines withDistributorTransaction using parameterized set_config('app.current_distributor_id', ..., true)",
      rlsSrc.includes("withDistributorTransaction") &&
        rlsSrc.includes("app.current_distributor_id") &&
        rlsSrc.includes(", true)")
    );

    const sqlPath = path.resolve(process.cwd(), "docs/database/03-distributor-rls-policies.sql");
    const sqlSrc = fs.readFileSync(sqlPath, "utf8");
    assert(
      "03-distributor-rls-policies.sql enables RLS on distributors, commission_ledger, and payout_requests",
      sqlSrc.includes('ALTER TABLE "distributors" ENABLE ROW LEVEL SECURITY') &&
        sqlSrc.includes('ALTER TABLE "commission_ledger" ENABLE ROW LEVEL SECURITY') &&
        sqlSrc.includes('ALTER TABLE "payout_requests" ENABLE ROW LEVEL SECURITY')
    );
  } catch (err: any) {
    assert("RLS verification crashed", false, err.message);
  }

  // 4. Distributor Role Guard Matrix
  try {
    const ownerOnlyGuard = requireDistributorRole("PARTNER_OWNER");
    let salesDenied = false;
    let ownerAllowed = false;

    ownerOnlyGuard(
      {
        distributorContext: {
          distributorId: "d1",
          userId: "u1",
          role: "SALES_AGENT",
          status: "ACTIVE",
          billingMode: "REV_SHARE",
        },
      } as any,
      {} as any,
      (err?: any) => {
        if (err && err.statusCode === 403) salesDenied = true;
      }
    );

    ownerOnlyGuard(
      {
        distributorContext: {
          distributorId: "d1",
          userId: "u1",
          role: "PARTNER_OWNER",
          status: "ACTIVE",
          billingMode: "REV_SHARE",
        },
      } as any,
      {} as any,
      (err?: any) => {
        if (!err) ownerAllowed = true;
      }
    );

    assert(
      "requireDistributorRole blocks SALES_AGENT from PARTNER_OWNER endpoints (payouts)",
      salesDenied && ownerAllowed
    );
  } catch (err: any) {
    assert("Distributor role guard crashed", false, err.message);
  }

  // 5. HTTP Route Authentication & Super Admin Guards
  try {
    const app = createApp();

    const unauthDash = await request(app).get("/api/v1/distributor/dashboard");
    assert("GET /api/v1/distributor/dashboard rejects unauthenticated requests with 401", unauthDash.status === 401);

    const regularToken = signAccessToken({
      sub: "22222222-2222-4222-a222-222222222222",
      email: "user@studio.local",
      isSuperAdmin: false,
    });

    const adminListDenied = await request(app)
      .get("/api/v1/admin/distributors")
      .set("Authorization", `Bearer ${regularToken}`);
    assert("GET /api/v1/admin/distributors rejects non-SuperAdmin with 403", adminListDenied.status === 403);

    const adminReviewDenied = await request(app)
      .patch("/api/v1/admin/distributors/11111111-1111-4111-a111-111111111111/review")
      .set("Authorization", `Bearer ${regularToken}`)
      .send({ status: "ACTIVE", commissionPercent: 25 });
    assert("PATCH /api/v1/admin/distributors/:id/review rejects non-SuperAdmin with 403", adminReviewDenied.status === 403);

    const adminOverviewDenied = await request(app)
      .get("/api/v1/admin/distributors/overview")
      .set("Authorization", `Bearer ${regularToken}`);
    assert("GET /api/v1/admin/distributors/overview rejects non-SuperAdmin with 403", adminOverviewDenied.status === 403);

    const adminPayoutDenied = await request(app)
      .patch("/api/v1/admin/distributors/payouts/11111111-1111-4111-a111-111111111111")
      .set("Authorization", `Bearer ${regularToken}`)
      .send({ status: "PAID" });
    assert("PATCH /api/v1/admin/distributors/payouts/:id rejects non-SuperAdmin with 403", adminPayoutDenied.status === 403);
  } catch (err: any) {
    assert("Distributor HTTP guard checks crashed", false, err.message);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { passed, failed, results };
}
