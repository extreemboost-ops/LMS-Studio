import { Plus, Activity, Database, CheckCircle2, X, Check } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useContent } from "../../context/ContentContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { PanelTitle } from "../../components/ui/PanelTitle";
import { StatusBadge } from "../../components/ui/StatusBadge";

export function Integrations() {
  const { notify } = useApp();
  const { integrations, syncActivities, toggleLMSConnection } = useContent();

  const moodle = integrations.find((i) => i.code === "moodle") || integrations[0];
  const otherConnectors = integrations.filter((i) => i.code !== "moodle");

  const handleToggleConnection = (id: string, name: string) => {
    toggleLMSConnection(id);
    const target = integrations.find((i) => i.id === id);
    const isNowConnected = target?.status !== "Connected";
    notify(
      isNowConnected
        ? `Successfully connected to ${name}`
        : `Disconnected from ${name}`,
    );
  };

  return (
    <>
      <PageHeader
        title="LMS integrations"
        subtitle="Connect your learning platforms and streamline content delivery."
      >
        <button
          className="btn primary"
          onClick={() => notify("LMS connection wizard opened — demonstration mode")}
          type="button"
        >
          <Plus size={16} />
          Add integration
        </button>
      </PageHeader>

      <div className="integration-feature">
        <div className="moodle-logo">m</div>
        <div>
          <div className="integration-title">
            <h2>{moodle.name}</h2>
            <StatusBadge status={moodle.status} />
          </div>
          <p>Publish and synchronize content directly with your Moodle workspace.</p>
          <div className="integration-meta">
            <span>
              <Activity size={15} />
              Last sync {moodle.lastSync || "18 min ago"}
            </span>
            <span>
              <Database size={15} />
              {moodle.itemsSynced || 24} items synced
            </span>
            <span>
              <CheckCircle2 size={15} />
              {moodle.health || "Healthy"}
            </span>
          </div>
        </div>
        <button
          className="btn secondary"
          onClick={() => handleToggleConnection(moodle.id, moodle.name)}
          type="button"
        >
          {moodle.status === "Connected" ? "Manage connection" : "Connect"}
        </button>
      </div>

      <div className="two-col">
        <section className="panel">
          <PanelTitle title="Available connections" />
          <div className="connection-list">
            {otherConnectors.map((c) => (
              <div key={c.id}>
                <div className="connection-logo">{c.logo}</div>
                <div>
                  <b>{c.name}</b>
                  <span>{c.type}</span>
                </div>
                <button
                  className={`btn ${c.status === "Connected" ? "secondary" : "primary"}`}
                  onClick={() => handleToggleConnection(c.id, c.name)}
                  type="button"
                >
                  {c.status === "Connected" ? "Disconnect" : "Connect"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <PanelTitle
            title="Recent sync activity"
            action="View history"
            onAction={() => notify("Viewing complete LMS sync history")}
          />
          <div className="activity-list">
            {syncActivities.map((a) => (
              <div key={a.id}>
                <div className={`activity-icon ${!a.success ? "error" : ""}`}>
                  {!a.success ? <X size={16} /> : <Check size={16} />}
                </div>
                <div>
                  <b>{a.contentTitle}</b>
                  <span>{a.action}</span>
                </div>
                <time>{a.time}</time>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
