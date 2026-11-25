# SCORM & H5P Authoring Studio — SaaS Commercialization & Distributor Hub Development Plan

## 1. Executive Vision & Business Model

This plan transforms the **SCORM & H5P Authoring Studio** from a multi-tenant platform into a **full B2B/B2C SaaS + Multi-Tier White-Label Distributor Platform**, enabling you to sell the software in **three simultaneous revenue channels**:

1. **Direct Self-Serve SaaS:** Organizations sign up directly, start a free trial, and subscribe via Stripe (Monthly/Annual plans).
2. **Partner / Distributor Reselling:** Approved Distributors/Agencies purchase wholesale seat pools or earn recurring revenue-share commissions by onboarding and managing their own client organizations.
3. **Enterprise / Offline B2B Licensing:** Distributors or Super Admins generate cryptographically secure **License Keys** for institutional/university procurement (PO/bank transfer) and white-label deployments.

---

## 2. Three-Tier Platform Hierarchy

```
+-----------------------------------------------------------------------------------+
| TIER 1: PLATFORM OWNER (Super Admin — `User.isSuperAdmin = true`)                 |
| - Defines global SaaS Plans, Quotas, Feature Flags & Pricing                      |
| - Approves/Suspends Distributors, sets Commission/Wholesale rates                 |
| - Monitors Global MRR/ARR, Storage, Export Usage & Approves Payouts               |
+-----------------------------------------------------------------------------------+
                                        |
         +------------------------------+------------------------------+
         | (Direct SaaS Customers)                                     | (Partner Channel)
         v                                                             v
+----------------------------------------+      +-----------------------------------+
| TIER 3A: DIRECT CLIENT ORGANIZATION    |      | TIER 2: DISTRIBUTOR / RESELLER    |
| - `distributorId = null`               |      | - Dedicated Distributor Hub UI    |
| - Pays platform directly via Stripe    |      | - White-label Branding & Domain   |
+----------------------------------------+      | - Provisions & bills sub-clients  |
                                                +-----------------------------------+
                                                                       |
                                                                       v
                                                +-----------------------------------+
                                                | TIER 3B: DISTRIBUTOR SUB-CLIENT   |
                                                | - `distributorId = <partner_id>`  |
                                                | - Isolated via PostgreSQL RLS     |
                                                | - Sees Partner's Logo & Branding  |
                                                +-----------------------------------+
```

---

## 3. Existing Codebase Integration Points

The plan builds directly on top of your verified architecture without breaking existing flows:
- **`prisma/schema.prisma`:** Extends `Organization` (`plan`, `storageQuotaBytes`, `isActive`) and `User` (`isSuperAdmin`).
- **`server/src/middlewares/auth.ts` & `tenantContext.ts`:** Adds `requireSuperAdmin`, `requireDistributorRole`, and `app.current_distributor_id` transaction-scoped PostgreSQL RLS context.
- **`server/src/modules/auth/auth.service.ts`:** Hooks `register()` to attach a default Trial `Subscription` or redeem a `LicenseKey` atomically.
- **`server/src/modules/storage/storage.service.ts` & `export-queue.service.ts`:** Enforces plan-level `maxMonthlyExports` and `storageQuotaBytes` via the new Entitlements Engine.

---

## 4. Database Architecture Extensions (`prisma/schema.prisma`)

### New Models to Add:

1. **`SaaSPlan`**
   - `id`, `code` (`starter`, `pro`, `business`, `enterprise`), `name`, `description`
   - `monthlyPriceCents`, `annualPriceCents`, `currency`
   - `maxSeats`, `maxWorkspaces`, `maxMonthlyExports`, `storageQuotaBytes`
   - `features` (JSONB: `{ lti13: boolean, whiteLabel: boolean, analyticsCsv: boolean, scorm2004: boolean, h5pImport: boolean }`)
   - `stripeMonthlyPriceId`, `stripeAnnualPriceId`, `isPublic`, `isActive`

2. **`Distributor`**
   - `id`, `name`, `slug` (unique), `status` (`PENDING`, `ACTIVE`, `SUSPENDED`)
   - `billingMode` (`REV_SHARE`, `WHOLESALE_POOL`, `HYBRID`)
   - `commissionPercent` (e.g. `25.00`), `wholesaleDiscountPercent`
   - `creditBalanceCents`, `seatPoolTotal`, `seatPoolUsed`
   - `customDomain` (unique, nullable), `brandingConfig` (JSONB: `logoUrl`, `primaryColor`, `appName`, `supportEmail`)
   - `stripeConnectAccountId`, `payoutDetails` (encrypted via `LMSCryptoService` AES-256-GCM)

3. **`DistributorMember`**
   - `distributorId`, `userId`, `role` (`PARTNER_OWNER`, `PARTNER_ADMIN`, `SALES_AGENT`), `status`

4. **`Subscription`**
   - `id`, `organizationId` (unique/active), `planId`, `distributorId?`
   - `status` (`TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELLED`, `SUSPENDED`)
   - `billingCycle` (`MONTHLY`, `ANNUAL`, `LIFETIME_KEY`)
   - `seatCount`, `trialEndsAt`, `currentPeriodStart`, `currentPeriodEnd`
   - `stripeCustomerId`, `stripeSubscriptionId`

5. **`LicenseKey`**
   - `id`, `codeHash` (SHA-256), `codePrefix` (e.g. `LMS-PRO-XXXX`), `planId`, `distributorId?`
   - `seatCount`, `durationDays`, `status` (`UNUSED`, `REDEEMED`, `REVOKED`, `EXPIRED`)
   - `redeemedByOrgId?`, `redeemedAt?`, `expiresAt?`

6. **`CommissionLedger` & `PayoutRequest`**
   - `CommissionLedger`: `distributorId`, `subscriptionId`, `organizationId`, `grossAmountCents`, `commissionCents`, `status` (`PENDING`, `AVAILABLE`, `PAID`, `CLAWBACK`)
   - `PayoutRequest`: `distributorId`, `amountCents`, `status` (`REQUESTED`, `APPROVED`, `PAID`, `REJECTED`), `referenceNote`

7. **`UsageMeter`**
   - `organizationId`, `periodKey` (`2026-11`), `exportsCount`, `activeSeatsCount`, `lmsSyncCount`

8. **PostgreSQL RLS Policies**
   - `distributors` and `commission_ledger` scoped to `app.current_distributor_id`.
   - `organizations` policy updated so a Distributor session can ONLY query organizations where `distributor_id = current_setting('app.current_distributor_id', true)`.

---

## 5. Phased Implementation Roadmap

### Phase 08.1 — SaaS Plans, Entitlements Engine & Quota Enforcement
**Goal:** Control what each paying or trial organization can do based on their active plan.
- **Backend:**
  - Seed default `SaaSPlan` catalog (`Free Trial`, `Starter`, `Pro Studio`, `Enterprise`).
  - Create `server/src/modules/billing/entitlements.service.ts` + middleware (`requireFeature()`, `enforceSeatLimit()`, `enforceExportQuota()`).
  - Hook into existing routes:
    - `POST /api/v1/organizations/:id/invitations` -> check `maxSeats`
    - `POST /api/v1/organizations/:id/workspaces` -> check `maxWorkspaces`
    - `POST /api/v1/export` & SCORM/H5P bundlers -> check `maxMonthlyExports` & `storageQuotaBytes`
    - `POST /api/v1/organizations/:id/lms` -> check `features.lti13`
  - Update `AuthService.register()` to provision a 14-day Trial `Subscription` automatically.
- **Tests:** Entitlement boundary tests, quota exceeded `402/403` responses, trial expiration checks.

### Phase 08.2 — Billing Engine, Stripe Integration & License Key System
**Goal:** Accept recurring SaaS payments and support B2B license keys.
- **Backend (`server/src/modules/billing/`):**
  - `GET /api/v1/billing/plans` (public pricing catalog)
  - `GET /api/v1/billing/subscription` (current org plan + real-time usage meters)
  - `POST /api/v1/billing/checkout` (create Stripe Checkout session)
  - `POST /api/v1/billing/portal` (Stripe Customer Billing Portal session)
  - `POST /api/v1/billing/redeem-license` (atomic license key redemption: validates hash, upgrades org plan, marks key `REDEEMED`)
  - `POST /api/v1/billing/webhooks/stripe` (raw-body signature verification, idempotent event processing, auto-records `CommissionLedger` if org has `distributorId`).
- **Frontend:**
  - **Subscription & Billing Tab** inside Organization Settings (Usage bars for Seats, Storage, Exports; Plan Comparison Grid; License Key input box).
  - **Trial / Quota Warning Banner** in Studio header.

### Phase 08.3 — Distributor Hub Backend, Client Provisioning & RLS
**Goal:** Allow partners/distributors to onboard, manage, and monetize their own customers safely.
- **Backend (`server/src/modules/distributor/`):**
  - `POST /api/v1/distributor/apply` (partner onboarding application)
  - `GET /api/v1/distributor/dashboard` (partner KPIs: total clients, active subscriptions, MRR, available commissions, seat pool)
  - `GET /api/v1/distributor/clients` (RLS-isolated list of sub-organizations)
  - `POST /api/v1/distributor/clients` (atomically provisions client `Organization`, `Workspace`, owner invite, assigns `distributorId`, deducts from `seatPoolTotal` or starts subscription)
  - `PATCH /api/v1/distributor/clients/:orgId/status` (suspend/reactivate non-paying client)
  - `POST /api/v1/distributor/licenses/generate` (bulk generate N license keys tied to partner)
  - `GET /api/v1/distributor/commissions` & `POST /api/v1/distributor/payouts`
- **Security:**
  - Strict cross-distributor isolation tests (Distributor A cannot view/suspend Distributor B's clients or Direct SaaS clients).

### Phase 08.4 — White-Label Branding & Custom Domain Engine
**Goal:** Let distributors sell the Studio under their own brand identity and domain.
- **Backend:**
  - `GET /api/v1/public/branding` — inspects `Origin` / `Host` header (or `?domain=`) and returns branding theme (`appName`, `logoUrl`, `primaryColor`, `faviconUrl`, `supportEmail`).
  - `PATCH /api/v1/distributor/branding` — update branding & custom domain CNAME verification (`TXT` / `CNAME` DNS check).
  - Dynamic Email Branding: `emailProvider.ts` injects partner logo/name into verification & invitation emails for sub-clients.
- **Frontend:**
  - Dynamic CSS variable hydration on app boot (`--brand-primary`, document title, sidebar logo).
  - White-Label Customizer UI with live studio preview inside the Distributor Hub.

### Phase 08.5 — Distributor Hub Frontend & Super Admin Command Center
**Goal:** Complete visual portals matching the existing Figma Make UI design system.
- **Distributor Hub Portal (`src/features/distributor/`):**
  - **Partner Overview:** Revenue & client growth charts, active seats, payout balance.
  - **Client Manager:** Provision client modal, plan switcher, suspend/activate toggle, usage inspector.
  - **License Vault:** Bulk key generator, copy-to-clipboard, CSV export, status badges.
  - **White-Label Studio:** Logo uploader, color theme picker, custom domain setup.
  - **Commissions & Payouts:** Ledger table + "Request Payout" workflow.
- **Super Admin Command Center (`src/features/super-admin/`):**
  - Accessible only when `user.isSuperAdmin === true`.
  - **Global SaaS Metrics:** Platform MRR, ARR, Total Active Tenants, Global Storage/Export load.
  - **Plan & Pricing Manager:** Create/edit plans and feature toggles without redeploying.
  - **Distributor Approvals & Payout Queue:** Approve new partner applications, adjust commission %, mark payouts as settled.
  - **Tenant Support Impersonation:** Time-limited, audited read/support session into any org (`AuditLog` recorded).

### Phase 08.6 — End-to-End Verification, Hardening & Production Rollout
- **Automated Test Suites (Suites 30–34):**
  - Entitlement & quota enforcement under concurrency.
  - Stripe webhook replay & signature forgery defense.
  - License key single-use atomic race-condition tests.
  - Distributor RLS boundary & cross-partner isolation verification.
  - White-label host-header injection prevention.

---

## 6. Recommended Execution Order

| Step | Milestone | Estimated Scope | Dependencies |
| :---: | :--- | :--- | :--- |
| **1** | **Phase 08.1** | Schema + Entitlements + Quota Guards | Existing Prisma & Auth |
| **2** | **Phase 08.2** | Stripe Billing + License Keys + Billing UI | Phase 08.1 |
| **3** | **Phase 08.3** | Distributor Backend + Client Provisioning + RLS | Phase 08.1, 08.2 |
| **4** | **Phase 08.4** | White-Label Branding + Custom Domains | Phase 08.3 |
| **5** | **Phase 08.5** | Distributor Hub UI + Super Admin Portal | Phase 08.3, 08.4 |
| **6** | **Phase 08.6** | Full SaaS & Distributor Security Test Gate | All above |
