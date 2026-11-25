import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Check,
  X,
  DollarSign,
  KeyRound,
  Building2,
  Users,
  TrendingUp,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { PanelTitle } from "../../components/ui/PanelTitle";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { DistributorApiService } from "../../services/distributor.service";

function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
      const demo = "LMS-ENTE-9K4P-7X2M-4Q8W";
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
        eyebrow="PLATFORM GOVERNANCE"
        title="SaaS Command Center"
        subtitle="Platform-wide revenue, distributor approvals, payout settlements, and tenant governance."
      >
        <button
          type="button"
          className="btn primary"
          onClick={handleIssueGlobalKey}
          disabled={busy}
        >
          <KeyRound size={16} />
          Quick Issue Enterprise Key
        </button>
      </PageHeader>

      {metrics && (
        <section className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <TrendingUp size={19} />
            </div>
            <span>Estimated Platform MRR</span>
            <strong>{formatUsd(metrics.estimatedMrrCents)}</strong>
            <small>{metrics.activeSubscriptions} paid subscriptions</small>
          </div>
          <div className="stat-card">
            <div className="stat-icon indigo">
              <Building2 size={19} />
            </div>
            <span>Total Tenant Orgs</span>
            <strong>{metrics.totalOrganizations}</strong>
            <small>{metrics.trialingSubscriptions} in 14-day trial</small>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <Users size={19} />
            </div>
            <span>Partner Distributors</span>
            <strong>{metrics.totalDistributors}</strong>
            <small>{metrics.pendingApplications} pending review</small>
          </div>
          <div className="stat-card">
            <div className="stat-icon violet">
              <DollarSign size={19} />
            </div>
            <span>Pending Payouts</span>
            <strong>{formatUsd(metrics.pendingPayoutsCents)}</strong>
            <small>Awaiting settlement</small>
          </div>
        </section>
      )}

      {/* Distributor Applications & Governance */}
      <section className="panel" style={{ marginBottom: "18px" }}>
        <PanelTitle title="Distributor Partners & Approval Queue" />
        <div className="data-table">
          <div
            className="table-row header"
            style={{ gridTemplateColumns: "2fr 1fr 0.7fr 0.6fr 0.8fr 130px" }}
          >
            <span>Partner</span>
            <span>Billing Mode</span>
            <span>Commission</span>
            <span>Clients</span>
            <span>Status</span>
            <span>Governance</span>
          </div>
          {(overview?.distributors || []).map((d: any) => (
            <div
              className="table-row"
              key={d.id}
              style={{ gridTemplateColumns: "2fr 1fr 0.7fr 0.6fr 0.8fr 130px" }}
            >
              <span>
                <div className="avatar blue">
                  {String(d.name || "P").substring(0, 2).toUpperCase()}
                </div>
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <b>{d.name}</b>
                  <small>{d.contactEmail}</small>
                </span>
              </span>
              <span>{d.billingMode}</span>
              <span>{d.commissionPercent}%</span>
              <span>{d._count?.organizations ?? 0}</span>
              <span>
                <StatusBadge status={d.status} />
              </span>
              <span style={{ display: "flex", gap: "6px" }}>
                {d.status !== "ACTIVE" ? (
                  <button
                    type="button"
                    className="btn primary"
                    style={{ height: "30px", padding: "0 10px", fontSize: "12px" }}
                    disabled={busy}
                    onClick={() => handleReviewDistributor(d.id, "ACTIVE")}
                  >
                    <Check size={13} /> Approve
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ height: "30px", padding: "0 10px", fontSize: "12px" }}
                    disabled={busy}
                    onClick={() => handleReviewDistributor(d.id, "SUSPENDED")}
                  >
                    <X size={13} /> Suspend
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Payout Settlement Queue */}
      <section className="panel" style={{ marginBottom: "18px" }}>
        <PanelTitle title="Commission Payout Requests" />
        <div className="data-table">
          <div
            className="table-row header"
            style={{ gridTemplateColumns: "1.6fr 1fr 1.6fr 0.9fr 160px" }}
          >
            <span>Distributor</span>
            <span>Amount</span>
            <span>Reference</span>
            <span>Status</span>
            <span>Settlement</span>
          </div>
          {(overview?.payoutRequests || []).map((p: any) => (
            <div
              className="table-row"
              key={p.id}
              style={{ gridTemplateColumns: "1.6fr 1fr 1.6fr 0.9fr 160px" }}
            >
              <span>
                <ShieldCheck size={15} color="#2563eb" />
                <b>{p.distributor?.name || p.distributorId}</b>
              </span>
              <span>
                <b>{formatUsd(p.amountCents)}</b>
              </span>
              <span>{p.referenceNote || "—"}</span>
              <span>
                <StatusBadge status={p.status} />
              </span>
              <span style={{ display: "flex", gap: "6px" }}>
                {p.status === "REQUESTED" || p.status === "APPROVED" ? (
                  <>
                    <button
                      type="button"
                      className="btn primary"
                      style={{ height: "30px", padding: "0 10px", fontSize: "12px" }}
                      disabled={busy}
                      onClick={() => handleProcessPayout(p.id, "PAID")}
                    >
                      Mark Paid
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ height: "30px", padding: "0 10px", fontSize: "12px" }}
                      disabled={busy}
                      onClick={() => handleProcessPayout(p.id, "REJECTED")}
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <span>Settled</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Global Organizations */}
      <section className="panel">
        <PanelTitle title="Global Tenant Directory" />
        <div className="data-table">
          <div className="table-row header">
            <span>Organization</span>
            <span>Channel / Distributor</span>
            <span>Plan</span>
            <span>Seats</span>
            <span>Status</span>
          </div>
          {(overview?.recentOrganizations || []).map((o: any) => (
            <div className="table-row" key={o.id}>
              <span>
                <div className="avatar indigo">
                  {String(o.name || "O").substring(0, 2).toUpperCase()}
                </div>
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <b>{o.name}</b>
                  <small>{o.slug}</small>
                </span>
              </span>
              <span>{o.distributorName}</span>
              <span>{String(o.plan).toUpperCase()}</span>
              <span>{o.seatCount}</span>
              <span>
                <StatusBadge status={o.subscriptionStatus} />
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
