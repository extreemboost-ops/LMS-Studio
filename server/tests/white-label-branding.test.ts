/**
 * Phase 08.4: White-Label Branding & Custom Domain Engine
 * Suite 33: Domain Host-Header Sanitization, Reserved Domain Defense, Email XSS Escaping & Public Branding
 */

import request from "supertest";
import { createApp } from "../src/app.js";
import { BrandingService, DEFAULT_BRANDING } from "../src/modules/distributor/branding.service.js";
import { updateBrandingSchema } from "../src/modules/distributor/branding.schema.js";
import { renderBrandedEmailHtml } from "../src/utils/emailProvider.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runWhiteLabelBrandingTests(): Promise<{
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

  // 1. Host-Header Injection & Domain Normalization
  try {
    assert(
      "normalizeDomainHost strips protocol, port, and lowercases valid hostname",
      BrandingService.normalizeDomainHost("https://Studio.ApexEdTech.io:8443/login") === "studio.apexedtech.io"
    );

    assert(
      "normalizeDomainHost rejects Host-header injection payloads",
      BrandingService.normalizeDomainHost("evil.com@victim.com") === null &&
        BrandingService.normalizeDomainHost("studio.com<script>alert(1)</script>") === null &&
        BrandingService.normalizeDomainHost("not a host") === null &&
        BrandingService.normalizeDomainHost("singlelabel") === null
    );

    assert(
      "isReservedDomain blocks claiming platform domains",
      BrandingService.isReservedDomain("my-app.vercel.app") &&
        BrandingService.isReservedDomain("api.onrender.com") &&
        !BrandingService.isReservedDomain("studio.apexedtech.io")
    );
  } catch (err: any) {
    assert("Domain normalization crashed", false, err.message);
  }

  // 2. Branding Zod Schema Validation
  try {
    const valid = updateBrandingSchema.safeParse({
      appName: "Apex Learning Studio",
      appSubtitle: "PARTNER EDITION",
      primaryColor: "#0F766E",
      logoUrl: "https://cdn.apexedtech.io/logo.png",
      customDomain: "studio.apexedtech.io",
      hidePoweredBy: true,
    });
    assert("updateBrandingSchema accepts valid white-label settings", valid.success);

    const badColor = updateBrandingSchema.safeParse({
      primaryColor: "red;background:url(javascript:alert(1))",
    });
    assert("updateBrandingSchema rejects non-hex CSS injection colors", !badColor.success);
  } catch (err: any) {
    assert("Branding schema validation crashed", false, err.message);
  }

  // 3. Branded Transactional Email XSS Escaping
  try {
    const html = renderBrandedEmailHtml({
      appName: 'Apex <script>alert("xss")</script> Studio',
      primaryColor: "#0F766E",
      supportEmail: "help@apex.io",
      bodyHtml: "<p>Welcome to your workspace.</p>",
    });

    assert(
      "renderBrandedEmailHtml escapes script tags in partner appName",
      !html.includes("<script>") && html.includes("&lt;script&gt;")
    );
    assert(
      "renderBrandedEmailHtml injects validated hex brand color",
      html.includes("#0F766E")
    );
  } catch (err: any) {
    assert("Branded email rendering crashed", false, err.message);
  }

  // 4. Public & Partner Branding HTTP Endpoints
  try {
    const app = createApp();

    const publicRes = await request(app).get("/api/v1/public/branding?domain=unknown.example.org");
    assert(
      "GET /api/v1/public/branding returns 200 with default branding for unknown domain",
      publicRes.status === 200 &&
        publicRes.body.success === true &&
        publicRes.body.data?.branding?.appName === DEFAULT_BRANDING.appName &&
        publicRes.body.data?.branding?.isWhiteLabeled === false
    );

    const partnerUnauth = await request(app).get("/api/v1/distributor/branding");
    assert(
      "GET /api/v1/distributor/branding requires authentication (401)",
      partnerUnauth.status === 401
    );

    const verifyUnauth = await request(app).post("/api/v1/distributor/branding/verify-domain");
    assert(
      "POST /api/v1/distributor/branding/verify-domain requires authentication (401)",
      verifyUnauth.status === 401
    );
  } catch (err: any) {
    assert("Branding HTTP endpoint tests crashed", false, err.message);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { passed, failed, results };
}
