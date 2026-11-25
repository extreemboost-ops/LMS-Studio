import { useEffect, useState } from "react";
import { Check, CreditCard, KeyRound, Sparkles, ExternalLink } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  BillingApiService,
  type OrganizationEntitlementsDto,
  type SaaSPlanDto,
} from "../../services/billing.service";

function formatBytes(bytesStr: string): string {
  const bytes = Number(bytesStr);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function MeterRow({ label, used, limit }: { label: string; used: number; limit: number }) {
  const isUnlimited = limit < 0;
  const pct = isUnlimited ? 15 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ color: "var(--text-muted, #64748b)" }}>
          {used} / {isUnlimited ? "Unlimited" : limit}
        </span>
      </div>
      <div
        style={{
          height: "7px",
          borderRadius: "999px",
          background: "var(--surface-muted, #e2e8f0)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: pct > 85 ? "#ef4444" : "var(--accent, #2563eb)",
            borderRadius: "999px",
            transition: "width 0.25s ease",
          }}
        />
      </div>
    </div>
  );
}

export function BillingSettingsPanel() {
  const { notify } = useApp();
  const [plans, setPlans] = useState<SaaSPlanDto[]>([]);
  const [entitlements, setEntitlements] = useState<OrganizationEntitlementsDto | null>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [licenseCode, setLicenseCode] = useState("");
  const [busy, setBusy] = useState(false);

  const loadBilling = async () => {
    const [plansRes, entRes] = await Promise.all([
      BillingApiService.listPlans(),
      BillingApiService.getEntitlements(),
    ]);
    setPlans(plansRes.data.plans);
    setEntitlements(entRes.data.entitlements);
  };

  useEffect(() => {
    void loadBilling();
  }, []);

  const handleCheckout = async (planCode: string) => {
    setBusy(true);
    try {
      const res = await BillingApiService.createCheckout(planCode, billingCycle);
      if (res.data?.url) {
        window.open(res.data.url, "_blank");
        notify("Redirecting to Stripe Checkout...");
      }
    } catch (err: any) {
      notify(err?.message || "Configure Stripe keys or redeem a B2B license key below");
    } finally {
      setBusy(false);
    }
  };

  const handlePortal = async () => {
    setBusy(true);
    try {
      const res = await BillingApiService.openPortal();
      if (res.data?.url) {
        window.open(res.data.url, "_blank");
      }
    } catch (err: any) {
      notify(err?.message || "Billing portal is available for active Stripe subscriptions");
    } finally {
      setBusy(false);
    }
  };

  const handleRedeemLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseCode.trim()) return;
    setBusy(true);
    try {
      const res = await BillingApiService.redeemLicense(licenseCode.trim());
      notify(`License redeemed! Upgraded to ${res.data.subscription.planName}`);
      setLicenseCode("");
      await loadBilling();
    } catch (err: any) {
      notify(err?.message || "Invalid or already redeemed license key");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {entitlements && (
        <div
          style={{
            padding: "16px",
            borderRadius: "10px",
            border: "1px solid var(--border, #e2e8f0)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={16} />
                <strong style={{ fontSize: "15px" }}>{entitlements.planName}</strong>
                <StatusBadge status={entitlements.status} />
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted, #64748b)", marginTop: "4px" }}>
                Storage: {formatBytes(entitlements.usage.storageBytesUsed)} /{" "}
                {formatBytes(entitlements.limits.storageQuotaBytes)}
              </p>
            </div>
            <button
              type="button"
              className="btn secondary"
              onClick={handlePortal}
              disabled={busy}
            >
              <CreditCard size={15} />
              Manage Invoices
              <ExternalLink size={13} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
            <MeterRow
              label="Team Seats"
              used={entitlements.usage.seatsUsed}
              limit={entitlements.limits.maxSeats}
            />
            <MeterRow
              label="Workspaces"
              used={entitlements.usage.workspacesUsed}
              limit={entitlements.limits.maxWorkspaces}
            />
            <MeterRow
              label="Monthly Exports"
              used={entitlements.usage.monthlyExportsUsed}
              limit={entitlements.limits.maxMonthlyExports}
            />
          </div>
        </div>
      )}

      {/* B2B License Key Redemption */}
      <form
        onSubmit={handleRedeemLicense}
        style={{
          padding: "16px",
          borderRadius: "10px",
          border: "1px solid var(--border, #e2e8f0)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "14px" }}>
          <KeyRound size={15} />
          <span>Redeem Distributor / Enterprise License Key</span>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: "1fr auto", alignItems: "end" }}>
          <label>
            <span>License Code</span>
            <input
              type="text"
              placeholder="LMS-PRO-XXXX-XXXX-XXXX"
              value={licenseCode}
              onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
            />
          </label>
          <button className="btn primary" type="submit" disabled={busy || !licenseCode.trim()}>
            Redeem Key
          </button>
        </div>
      </form>

      {/* Plan Comparison */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: "14px" }}>Available Plans</strong>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className={billingCycle === "MONTHLY" ? "btn primary" : "btn secondary"}
            onClick={() => setBillingCycle("MONTHLY")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={billingCycle === "ANNUAL" ? "btn primary" : "btn secondary"}
            onClick={() => setBillingCycle("ANNUAL")}
          >
            Annual (Save 17%)
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        {plans.map((plan) => {
          const isCurrent = entitlements?.planCode === plan.code;
          const price =
            billingCycle === "ANNUAL"
              ? Math.round(plan.annualPriceCents / 1200)
              : Math.round(plan.monthlyPriceCents / 100);

          return (
            <div
              key={plan.code}
              style={{
                padding: "14px",
                borderRadius: "10px",
                border: isCurrent ? "2px solid var(--accent, #2563eb)" : "1px solid var(--border, #e2e8f0)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "15px" }}>{plan.name}</div>
                <div style={{ fontSize: "22px", fontWeight: 700, margin: "6px 0" }}>
                  ${price}
                  <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-muted, #64748b)" }}>
                    /mo
                  </span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <li style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Check size={13} /> {plan.maxSeats < 0 ? "Unlimited" : plan.maxSeats} seats
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Check size={13} /> {plan.maxMonthlyExports < 0 ? "Unlimited" : plan.maxMonthlyExports} exports/mo
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Check size={13} /> {plan.features.lti13 ? "LTI 1.3 & LMS Sync" : "Core SCORM & H5P"}
                  </li>
                </ul>
              </div>

              <button
                type="button"
                className={isCurrent ? "btn secondary" : "btn primary"}
                disabled={isCurrent || busy}
                onClick={() => handleCheckout(plan.code)}
              >
                {isCurrent ? "Current Plan" : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
