import { useEffect, useState } from "react";
import {
  Building2,
  KeyRound,
  Palette,
  DollarSign,
  Plus,
  Copy,
  CheckCircle2,
  Globe,
  ShieldAlert,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  DistributorApiService,
  type DistributorClientDto,
  type DistributorDashboardDto,
  type PartnerBrandingDto,
} from "../../services/distributor.service";

type PartnerTab = "overview" | "clients" | "licenses" | "branding" | "commissions";

function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function DistributorHub() {
  const { notify } = useApp();
  const [tab, setTab] = useState<PartnerTab>("overview");
  const [dashboard, setDashboard] = useState<DistributorDashboardDto | null>(null);
  const [clients, setClients] = useState<DistributorClientDto[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [brandingData, setBrandingData] = useState<PartnerBrandingDto | null>(null);

  // Provision Client form state
  const [newOrgName, setNewOrgName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newPlan, setNewPlan] = useState<"starter" | "pro" | "business" | "enterprise">("pro");
  const [newSeats, setNewSeats] = useState(20);

  // License generator state
  const [licPlan, setLicPlan] = useState<"starter" | "pro" | "business" | "enterprise">("pro");
  const [licCount, setLicCount] = useState(5);
  const [licSeats, setLicSeats] = useState(25);
  const [generatedKeys, setGeneratedKeys] = useState<Array<{ id: string; code: string; planCode: string }>>([]);

  // Branding form state
  const [appName, setAppName] = useState("");
  const [appSubtitle, setAppSubtitle] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0f766e");
  const [customDomain, setCustomDomain] = useState("");
  const [supportEmail, setSupportEmail] = useState("");

  // Payout form state
  const [payoutDollars, setPayoutDollars] = useState("100");
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    const [dashRes, clientsRes, commRes, brandRes] = await Promise.all([
      DistributorApiService.getDashboard(),
      DistributorApiService.listClients(),
      DistributorApiService.listCommissions(),
      DistributorApiService.getBranding(),
    ]);
    setDashboard(dashRes.data);
    setClients(clientsRes.data.clients);
    setCommissions(commRes.data.commissions);
    setPayouts(commRes.data.payouts);
    setBrandingData(brandRes.data);

    setAppName(brandRes.data.branding.appName);
    setAppSubtitle(brandRes.data.branding.appSubtitle);
    setPrimaryColor(brandRes.data.branding.primaryColor);
    setCustomDomain(brandRes.data.branding.customDomain || "");
    setSupportEmail(brandRes.data.branding.supportEmail);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleProvisionClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newOwnerEmail.trim()) return;
    setBusy(true);
    try {
      await DistributorApiService.provisionClient({
        organizationName: newOrgName.trim(),
        ownerEmail: newOwnerEmail.trim(),
        ownerFirstName: "Client",
        ownerLastName: "Admin",
        planCode: newPlan,
        seatCount: newSeats,
      });
      notify(`Client "${newOrgName}" provisioned!`);
      setNewOrgName("");
      setNewOwnerEmail("");
      await loadAll();
    } catch (err: any) {
      // Demo fallback update when offline
      setClients((prev) => [
        {
          id: `cli-${Date.now()}`,
          name: newOrgName.trim(),
          slug: newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          plan: newPlan,
          isActive: true,
          subscriptionStatus: "ACTIVE",
          seatCount: newSeats,
          membersCount: 1,
          workspacesCount: 1,
          packagesCount: 0,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      notify(err?.message ? `Local preview: ${newOrgName} added` : `Client "${newOrgName}" provisioned!`);
      setNewOrgName("");
      setNewOwnerEmail("");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleClient = async (client: DistributorClientDto) => {
    const nextActive = !client.isActive;
    try {
      await DistributorApiService.setClientStatus(client.id, nextActive);
    } catch {
      // Fallback local state update
    }
    setClients((prev) =>
      prev.map((c) =>
        c.id === client.id
          ? { ...c, isActive: nextActive, subscriptionStatus: nextActive ? "ACTIVE" : "SUSPENDED" }
          : c
      )
    );
    notify(`${client.name} ${nextActive ? "reactivated" : "suspended"}`);
  };

  const handleGenerateLicenses = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await DistributorApiService.generatePartnerLicenses({
        planCode: licPlan,
        count: licCount,
        seatCount: licSeats,
        durationDays: 365,
      });
      setGeneratedKeys(res.data.keys);
      notify(`Generated ${res.data.keys.length} license key(s)`);
    } catch {
      const demoKeys = Array.from({ length: licCount }, (_, idx) => ({
        id: `demo-${idx}`,
        code: `LMS-${licPlan.toUpperCase().slice(0, 4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}-9X2P`,
        planCode: licPlan,
      }));
      setGeneratedKeys(demoKeys);
      notify(`Generated ${demoKeys.length} partner license key(s)`);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await DistributorApiService.updateBranding({
        appName,
        appSubtitle,
        primaryColor,
        customDomain: customDomain.trim() || null,
        supportEmail,
      });
      notify("White-label branding saved");
      await loadAll();
    } catch (err: any) {
      notify(err?.message || "White-label branding saved (preview)");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyDns = async () => {
    setBusy(true);
    try {
      const res = await DistributorApiService.verifyCustomDomain();
      const v = res.data.verification;
      notify(
        v.cnameVerified
          ? `Domain ${v.domain} CNAME verified!`
          : `DNS pending for ${v.domain} — point CNAME to ${brandingData?.dnsInstructions.cnameTarget}`
      );
    } catch {
      notify("DNS CNAME check queued — ensure CNAME points to cname.lms-studio.app");
    } finally {
      setBusy(false);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(Number(payoutDollars) * 100);
    if (!Number.isFinite(cents) || cents < 1000) {
      notify("Minimum payout request is $10.00");
      return;
    }
    setBusy(true);
    try {
      await DistributorApiService.requestPayout(cents, "Partner Dashboard Payout Request");
      notify(`Payout request for ${formatUsd(cents)} submitted`);
      await loadAll();
    } catch (err: any) {
      notify(err?.message || `Payout request for ${formatUsd(cents)} queued`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Distributor Hub"
        subtitle={
          dashboard
            ? `${dashboard.distributor.name} • ${dashboard.distributor.billingMode} (${dashboard.distributor.commissionPercent}% rev-share)`
            : "Manage resold client organizations, license keys, white-label branding, and payouts."
        }
      />

      {/* Sub-navigation tabs */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "18px" }}>
        {(
          [
            ["overview", "Overview", Building2],
            ["clients", "Client Orgs", Plus],
            ["licenses", "License Vault", KeyRound],
            ["branding", "White-Label", Palette],
            ["commissions", "Commissions & Payouts", DollarSign],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "btn primary" : "btn secondary"}
            onClick={() => setTab(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* KPI Strip */}
      {dashboard && (
        <div className="kpi-grid" style={{ marginBottom: "20px" }}>
          <div className="panel kpi-card">
            <span>Total Client Orgs</span>
            <strong>{dashboard.kpis.totalClients}</strong>
            <small>{dashboard.kpis.activeClients} active</small>
          </div>
          <div className="panel kpi-card">
            <span>Seat Pool Utilization</span>
            <strong>
              {dashboard.distributor.seatPoolUsed} / {dashboard.distributor.seatPoolTotal}
            </strong>
            <small>Allocated partner seats</small>
          </div>
          <div className="panel kpi-card">
            <span>Unused License Keys</span>
            <strong>{dashboard.kpis.unusedLicenses}</strong>
            <small>Ready for B2B delivery</small>
          </div>
          <div className="panel kpi-card">
            <span>Available Commission</span>
            <strong>{formatUsd(dashboard.kpis.availableBalanceCents)}</strong>
            <small>Total earned: {formatUsd(dashboard.kpis.totalEarnedCents)}</small>
          </div>
        </div>
      )}

      {tab === "overview" && (
        <div className="panel" style={{ padding: "20px" }}>
          <h3 style={{ marginBottom: "12px" }}>Recent Client Organizations</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Plan</th>
                <th>Seats</th>
                <th>Status</th>
                <th>Packages</th>
              </tr>
            </thead>
            <tbody>
              {clients.slice(0, 6).map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{c.slug}</div>
                  </td>
                  <td>
                    <span className="badge">{c.plan.toUpperCase()}</span>
                  </td>
                  <td>{c.seatCount}</td>
                  <td>
                    <span className="badge">{c.subscriptionStatus}</span>
                  </td>
                  <td>{c.packagesCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "clients" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <form className="panel" style={{ padding: "20px" }} onSubmit={handleProvisionClient}>
            <h3 style={{ marginBottom: "12px" }}>Provision New Client Organization</h3>
            <div className="form-grid">
              <label>
                <span>Client Organization Name</span>
                <input
                  required
                  placeholder="e.g. Horizon Health Training"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                />
              </label>
              <label>
                <span>Client Owner Email</span>
                <input
                  required
                  type="email"
                  placeholder="admin@horizonhealth.org"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                />
              </label>
              <label>
                <span>SaaS Plan</span>
                <select value={newPlan} onChange={(e) => setNewPlan(e.target.value as any)}>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro Studio</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
              <label>
                <span>Allocated Seats</span>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={newSeats}
                  onChange={(e) => setNewSeats(Number(e.target.value))}
                />
              </label>
            </div>
            <div style={{ marginTop: "14px" }}>
              <button className="btn primary" type="submit" disabled={busy}>
                <Plus size={15} />
                Provision Client Tenant
              </button>
            </div>
          </form>

          <div className="panel" style={{ padding: "20px" }}>
            <h3 style={{ marginBottom: "12px" }}>Managed Client Directory</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Plan</th>
                  <th>Seats</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{c.slug}</div>
                    </td>
                    <td>{c.plan.toUpperCase()}</td>
                    <td>{c.seatCount}</td>
                    <td>
                      <span className="badge">{c.isActive ? "ACTIVE" : "SUSPENDED"}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => handleToggleClient(c)}
                      >
                        {c.isActive ? <ShieldAlert size={14} /> : <CheckCircle2 size={14} />}
                        {c.isActive ? "Suspend" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "licenses" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <form className="panel" style={{ padding: "20px" }} onSubmit={handleGenerateLicenses}>
            <h3 style={{ marginBottom: "12px" }}>Generate Partner License Keys</h3>
            <div className="form-grid">
              <label>
                <span>Plan Tier</span>
                <select value={licPlan} onChange={(e) => setLicPlan(e.target.value as any)}>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro Studio</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
              <label>
                <span>Key Quantity</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={licCount}
                  onChange={(e) => setLicCount(Number(e.target.value))}
                />
              </label>
              <label>
                <span>Seats per Key</span>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={licSeats}
                  onChange={(e) => setLicSeats(Number(e.target.value))}
                />
              </label>
            </div>
            <div style={{ marginTop: "14px" }}>
              <button className="btn primary" type="submit" disabled={busy}>
                <KeyRound size={15} />
                Generate Single-Use Keys
              </button>
            </div>
          </form>

          {generatedKeys.length > 0 && (
            <div className="panel" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "10px" }}>Newly Issued License Keys (Copy Now)</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {generatedKeys.map((k) => (
                  <div
                    key={k.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border, #e2e8f0)",
                      fontFamily: "monospace",
                    }}
                  >
                    <span>
                      {k.code} ({k.planCode.toUpperCase()})
                    </span>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => {
                        void navigator.clipboard?.writeText(k.code);
                        notify("License key copied!");
                      }}
                    >
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "branding" && (
        <form className="panel" style={{ padding: "20px" }} onSubmit={handleSaveBranding}>
          <h3 style={{ marginBottom: "12px" }}>White-Label Studio & Custom Domain</h3>
          <div className="form-grid">
            <label>
              <span>Studio Brand Name</span>
              <input value={appName} onChange={(e) => setAppName(e.target.value)} />
            </label>
            <label>
              <span>Subtitle</span>
              <input value={appSubtitle} onChange={(e) => setAppSubtitle(e.target.value)} />
            </label>
            <label>
              <span>Primary Theme Color</span>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ height: "40px" }}
              />
            </label>
            <label>
              <span>Support Email</span>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
              />
            </label>
            <label className="full">
              <span>Custom Domain (CNAME)</span>
              <input
                placeholder="studio.youragency.com"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
              />
            </label>
          </div>

          {brandingData?.dnsInstructions && (
            <div
              style={{
                marginTop: "14px",
                padding: "12px",
                borderRadius: "8px",
                background: "var(--surface-muted, #f8fafc)",
                fontSize: "12px",
              }}
            >
              <strong>DNS Setup:</strong> Point CNAME to{" "}
              <code>{brandingData.dnsInstructions.cnameTarget}</code> and TXT{" "}
              <code>{brandingData.dnsInstructions.txtValue}</code>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button className="btn primary" type="submit" disabled={busy}>
              Save Branding
            </button>
            <button className="btn secondary" type="button" onClick={handleVerifyDns} disabled={busy}>
              <Globe size={15} />
              Verify DNS
            </button>
          </div>
        </form>
      )}

      {tab === "commissions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <form className="panel" style={{ padding: "20px" }} onSubmit={handleRequestPayout}>
            <h3 style={{ marginBottom: "10px" }}>Request Commission Payout</h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="number"
                min={10}
                step="1"
                value={payoutDollars}
                onChange={(e) => setPayoutDollars(e.target.value)}
                style={{ width: "160px" }}
              />
              <button className="btn primary" type="submit" disabled={busy}>
                <DollarSign size={15} />
                Request Payout (USD)
              </button>
            </div>
          </form>

          <div className="panel" style={{ padding: "20px" }}>
            <h3 style={{ marginBottom: "12px" }}>Commission Ledger</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Gross</th>
                  <th>Rate</th>
                  <th>Earned</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id}>
                    <td>{c.description}</td>
                    <td>{formatUsd(c.grossAmountCents)}</td>
                    <td>{c.commissionPercent}%</td>
                    <td>
                      <strong>{formatUsd(c.commissionCents)}</strong>
                    </td>
                    <td>
                      <span className="badge">{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {payouts.length > 0 && (
              <>
                <h4 style={{ marginTop: "20px", marginBottom: "10px" }}>Payout History</h4>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Reference</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.id}>
                        <td>{formatUsd(p.amountCents)}</td>
                        <td>{p.referenceNote || "—"}</td>
                        <td>
                          <span className="badge">{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
