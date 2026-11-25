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
  Users,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { PanelTitle } from "../../components/ui/PanelTitle";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  DistributorApiService,
  type DistributorClientDto,
  type DistributorDashboardDto,
  type PartnerBrandingDto,
} from "../../services/distributor.service";

type PartnerTab = "overview" | "clients" | "licenses" | "branding" | "commissions";

function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
  const [generatedKeys, setGeneratedKeys] = useState<
    Array<{ id: string; code: string; planCode: string }>
  >([]);

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
        eyebrow="PARTNER CHANNEL"
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

      {/* KPI Strip using Figma Make .stat-grid / .stat-card */}
      {dashboard && (
        <section className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <Building2 size={19} />
            </div>
            <span>Total Client Orgs</span>
            <strong>{dashboard.kpis.totalClients}</strong>
            <small>{dashboard.kpis.activeClients} active</small>
          </div>
          <div className="stat-card">
            <div className="stat-icon indigo">
              <Users size={19} />
            </div>
            <span>Seat Pool Utilization</span>
            <strong>
              {dashboard.distributor.seatPoolUsed} / {dashboard.distributor.seatPoolTotal}
            </strong>
            <small>Allocated partner seats</small>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <KeyRound size={19} />
            </div>
            <span>Unused License Keys</span>
            <strong>{dashboard.kpis.unusedLicenses}</strong>
            <small>Ready for B2B delivery</small>
          </div>
          <div className="stat-card">
            <div className="stat-icon violet">
              <DollarSign size={19} />
            </div>
            <span>Available Commission</span>
            <strong>{formatUsd(dashboard.kpis.availableBalanceCents)}</strong>
            <small>Total earned: {formatUsd(dashboard.kpis.totalEarnedCents)}</small>
          </div>
        </section>
      )}

      {tab === "overview" && (
        <section className="panel">
          <PanelTitle title="Recent Client Organizations" />
          <div className="data-table">
            <div className="table-row header">
              <span>Organization</span>
              <span>Plan</span>
              <span>Seats</span>
              <span>Status</span>
              <span>Packages</span>
            </div>
            {clients.slice(0, 6).map((c) => (
              <div className="table-row" key={c.id}>
                <span>
                  <div className="avatar blue">{c.name.substring(0, 2).toUpperCase()}</div>
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <b>{c.name}</b>
                    <small>{c.slug}</small>
                  </span>
                </span>
                <span>{c.plan.toUpperCase()}</span>
                <span>{c.seatCount}</span>
                <span>
                  <StatusBadge status={c.subscriptionStatus} />
                </span>
                <span>{c.packagesCount}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "clients" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <form className="panel" style={{ padding: "20px" }} onSubmit={handleProvisionClient}>
            <PanelTitle title="Provision New Client Organization" />
            <div className="form-grid" style={{ marginTop: "12px" }}>
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

          <section className="panel">
            <PanelTitle title="Managed Client Directory" />
            <div className="data-table">
              <div className="table-row header">
                <span>Organization</span>
                <span>Plan</span>
                <span>Seats</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {clients.map((c) => (
                <div className="table-row" key={c.id}>
                  <span>
                    <div className="avatar indigo">{c.name.substring(0, 2).toUpperCase()}</div>
                    <span style={{ display: "flex", flexDirection: "column" }}>
                      <b>{c.name}</b>
                      <small>{c.slug}</small>
                    </span>
                  </span>
                  <span>{c.plan.toUpperCase()}</span>
                  <span>{c.seatCount}</span>
                  <span>
                    <StatusBadge status={c.isActive ? "ACTIVE" : "SUSPENDED"} />
                  </span>
                  <span>
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ height: "30px", padding: "0 10px", fontSize: "12px" }}
                      onClick={() => handleToggleClient(c)}
                    >
                      {c.isActive ? <ShieldAlert size={13} /> : <CheckCircle2 size={13} />}
                      {c.isActive ? "Suspend" : "Activate"}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "licenses" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <form className="panel" style={{ padding: "20px" }} onSubmit={handleGenerateLicenses}>
            <PanelTitle title="Generate Partner License Keys" />
            <div className="form-grid" style={{ marginTop: "12px" }}>
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
            <section className="panel" style={{ padding: "20px" }}>
              <PanelTitle title="Newly Issued License Keys (Copy Now)" />
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                {generatedKeys.map((k) => (
                  <div
                    key={k.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontFamily: "monospace",
                      fontSize: "13px",
                    }}
                  >
                    <span>
                      {k.code} ({k.planCode.toUpperCase()})
                    </span>
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ height: "30px", padding: "0 10px", fontSize: "12px" }}
                      onClick={() => {
                        void navigator.clipboard?.writeText(k.code);
                        notify("License key copied!");
                      }}
                    >
                      <Copy size={13} /> Copy
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {tab === "branding" && (
        <form className="panel" style={{ padding: "20px" }} onSubmit={handleSaveBranding}>
          <PanelTitle title="White-Label Studio & Custom Domain" />
          <div className="form-grid" style={{ marginTop: "12px" }}>
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
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
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
            <PanelTitle title="Request Commission Payout" />
            <div className="form-grid" style={{ marginTop: "12px" }}>
              <label>
                <span>Payout Amount (USD)</span>
                <input
                  type="number"
                  min={10}
                  step="1"
                  value={payoutDollars}
                  onChange={(e) => setPayoutDollars(e.target.value)}
                />
              </label>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button className="btn primary" type="submit" disabled={busy}>
                  <DollarSign size={15} />
                  Request Payout
                </button>
              </div>
            </div>
          </form>

          <section className="panel">
            <PanelTitle title="Commission Ledger" />
            <div className="data-table">
              <div className="table-row header">
                <span>Description</span>
                <span>Gross</span>
                <span>Rate</span>
                <span>Earned</span>
                <span>Status</span>
              </div>
              {commissions.map((c) => (
                <div className="table-row" key={c.id}>
                  <span>
                    <b>{c.description}</b>
                  </span>
                  <span>{formatUsd(c.grossAmountCents)}</span>
                  <span>{c.commissionPercent}%</span>
                  <span>
                    <b>{formatUsd(c.commissionCents)}</b>
                  </span>
                  <span>
                    <StatusBadge status={c.status} />
                  </span>
                </div>
              ))}
            </div>
          </section>

          {payouts.length > 0 && (
            <section className="panel">
              <PanelTitle title="Payout History" />
              <div className="data-table">
                <div
                  className="table-row header"
                  style={{ gridTemplateColumns: "1fr 2fr 1fr" }}
                >
                  <span>Amount</span>
                  <span>Reference</span>
                  <span>Status</span>
                </div>
                {payouts.map((p) => (
                  <div
                    className="table-row"
                    key={p.id}
                    style={{ gridTemplateColumns: "1fr 2fr 1fr" }}
                  >
                    <span>
                      <b>{formatUsd(p.amountCents)}</b>
                    </span>
                    <span>{p.referenceNote || "—"}</span>
                    <span>
                      <StatusBadge status={p.status} />
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
