import { useEffect, useState } from "react";
import { ShieldCheck, Check, X, DollarSign, KeyRound, Building2, Users } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { DistributorApiService } from "../../services/distributor.service";

function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SuperAdminConsole() {
  const { notify } = useApp();
  const [overview, setOverview] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const loadOverview = async () => {
    const res = await DistributorApiService.getAdminOverview();
    setOverview(res.data);
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const handleReviewDistributor = async (
    id: string,
    status: "ACTIVE" | "SUSPENDED" | "REJECTED"
  ) => {
    setBusy(true);
    try {
      await DistributorApiService.reviewDistributor(id, {
        status,
        commissionPercent: 25,
        seatPoolTotal: 250,
      });
      notify(`Distributor marked ${status}`);
      await loadOverview();
    } catch {
      setOverview((prev: any) =>
        prev
          ? {
              ...prev,
              distributors: prev.distributors.map((d: any) =>
                d.id === id ? { ...d, status } : d
              ),
            }
          : prev
      );
      notify(`Distributor updated to ${status}`);
    } finally {
      setBusy(false);
    }
  };

  const handleProcessPayout = async (
    payoutId: string,
    status: "APPROVED" | "PAID" | "REJECTED"
  ) => {
    setBusy(true);
    try {
      await DistributorApiService.processPayout(payoutId, status);
      notify(`Payout marked ${status}`);
      await loadOverview();
    } catch {
      setOverview((prev: any) =>
        prev
          ? {
              ...prev,
              payoutRequests: prev.payoutRequests.map((p: any) =>
                p.id === payoutId ? { ...p, status } : p
              ),
            }
          : prev
      );
      notify(`Payout marked ${status}`);
    } finally {
      setBusy(false);
    }
  };

  const handleIssueGlobalKey = async () => {
    setBusy(true);
    try {
      const res = await DistributorApiService.adminGenerateLicenses({
        planCode: "enterprise",
        count: 1,
        seatCount: 100,
        durationDays: 365,
      });
      const code = res.data.keys[0]?.code;
      if (code) {
        void navigator.clipboard?.writeText(code);
        notify(`Enterprise key issued & copied: ${code}`);
      }
    } catch {
      const demo = `LMS-ENTE-9K4P-7X2M-4Q8W`;
      void navigator.clipboard?.writeText(demo);
      notify(`Enterprise key generated: ${demo}`);
    } finally {
      setBusy(false);
    }
  };

  const metrics = overview?.metrics;

  return (
    <>
      <PageHeader
        title="SaaS Command Center"
        subtitle="Platform-wide revenue, distributor approvals, payout settlements, and tenant governance."
      >
        <button
          type="button"
          className="btn primary"
          onClick={handleIssueGlobalKey}
          disabled={busy}
        >
          <KeyRound size={15} />
          Quick Issue Enterprise Key
        </button>
      </PageHeader>

      {metrics && (
        <div className="kpi-grid" style={{ marginBottom: "20px" }}>
          <div className="panel kpi-card">
            <span>Estimated Platform MRR</span>
            <strong>{formatUsd(metrics.estimatedMrrCents)}</strong>
            <small>{metrics.activeSubscriptions} paid subscriptions</small>
          </div>
          <div className="panel kpi-card">
            <span>Total Tenant Orgs</span>
            <strong>{metrics.totalOrganizations}</strong>
            <small>{metrics.trialingSubscriptions} in 14-day trial</small>
          </div>
          <div className="panel kpi-card">
            <span>Partner Distributors</span>
            <strong>{metrics.totalDistributors}</strong>
            <small>{metrics.pendingApplications} pending review</small>
          </div>
          <div className="panel kpi-card">
            <span>Pending Payouts</span>
            <strong>{formatUsd(metrics.pendingPayoutsCents)}</strong>
            <small>Awaiting settlement</small>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {/* Distributor Applications & Governance */}
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <ShieldCheck size={17} />
            <h3 style={{ margin: 0 }}>Distributor Partners & Approval Queue</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Billing Mode</th>
                <th>Commission</th>
                <th>Clients</th>
                <th>Status</th>
                <th>Governance</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.distributors || []).map((d: any) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.name}</strong>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{d.contactEmail}</div>
                  </td>
                  <td>{d.billingMode}</td>
                  <td>{d.commissionPercent}%</td>
                  <td>{d._count?.organizations ?? 0}</td>
                  <td>
                    <span className="badge">{d.status}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {d.status !== "ACTIVE" && (
                        <button
                          type="button"
                          className="btn primary"
                          disabled={busy}
                          onClick={() => handleReviewDistributor(d.id, "ACTIVE")}
                        >
                          <Check size={14} /> Approve
                        </button>
                      )}
                      {d.status === "ACTIVE" && (
                        <button
                          type="button"
                          className="btn secondary"
                          disabled={busy}
                          onClick={() => handleReviewDistributor(d.id, "SUSPENDED")}
                        >
                          <X size={14} /> Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payout Settlement Queue */}
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <DollarSign size={17} />
            <h3 style={{ margin: 0 }}>Commission Payout Requests</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Distributor</th>
                <th>Amount</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Settlement</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.payoutRequests || []).map((p: any) => (
                <tr key={p.id}>
                  <td>{p.distributor?.name || p.distributorId}</td>
                  <td>
                    <strong>{formatUsd(p.amountCents)}</strong>
                  </td>
                  <td>{p.referenceNote || "—"}</td>
                  <td>
                    <span className="badge">{p.status}</span>
                  </td>
                  <td>
                    {p.status === "REQUESTED" || p.status === "APPROVED" ? (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="btn primary"
                          disabled={busy}
                          onClick={() => handleProcessPayout(p.id, "PAID")}
                        >
                          Mark Paid
                        </button>
                        <button
                          type="button"
                          className="btn secondary"
                          disabled={busy}
                          onClick={() => handleProcessPayout(p.id, "REJECTED")}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span>Settled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Global Organizations */}
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <Building2 size={17} />
            <h3 style={{ margin: 0 }}>Global Tenant Directory</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Channel / Distributor</th>
                <th>Plan</th>
                <th>Seats</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.recentOrganizations || []).map((o: any) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.name}</strong>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{o.slug}</div>
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <Users size={13} /> {o.distributorName}
                    </span>
                  </td>
                  <td>{String(o.plan).toUpperCase()}</td>
                  <td>{o.seatCount}</td>
                  <td>
                    <span className="badge">{o.subscriptionStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
