-- ==============================================================================
-- Phase 08.3: Cross-Distributor PostgreSQL Row-Level Security (RLS) Policies
-- ==============================================================================
-- Ensures strict multi-tier isolation:
-- 1. Distributor A can only query/modify its own Distributor profile, ledger, and sub-clients.
-- 2. Direct SaaS customers (distributor_id IS NULL) are invisible to all Distributors.
-- ==============================================================================

ALTER TABLE "distributors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "distributor_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_ledger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payout_requests" ENABLE ROW LEVEL SECURITY;

-- Distributor self-isolation
CREATE POLICY "distributor_self_isolation" ON "distributors"
  FOR ALL
  USING (id = NULLIF(current_setting('app.current_distributor_id', true), '')::uuid);

-- Commission Ledger isolation
CREATE POLICY "distributor_commission_isolation" ON "commission_ledger"
  FOR ALL
  USING (distributor_id = NULLIF(current_setting('app.current_distributor_id', true), '')::uuid)
  WITH CHECK (distributor_id = NULLIF(current_setting('app.current_distributor_id', true), '')::uuid);

-- Payout Requests isolation
CREATE POLICY "distributor_payout_isolation" ON "payout_requests"
  FOR ALL
  USING (distributor_id = NULLIF(current_setting('app.current_distributor_id', true), '')::uuid)
  WITH CHECK (distributor_id = NULLIF(current_setting('app.current_distributor_id', true), '')::uuid);

-- Organizations: Allow access either to the active Tenant Org OR its owning Distributor
CREATE POLICY "organization_distributor_isolation" ON "organizations"
  FOR SELECT
  USING (
    id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
    OR distributor_id = NULLIF(current_setting('app.current_distributor_id', true), '')::uuid
  );
