import { Library, Plus, Sparkles, FolderKanban, Boxes, FileArchive, UsersRound, ChevronRight, MoreHorizontal } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useContent } from "../../context/ContentContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { PanelTitle } from "../../components/ui/PanelTitle";
import { ProjectThumb } from "../../components/ui/ProjectThumb";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { contentTypes } from "../../mocks/content.mock";
import { exportActivityBars } from "../../mocks/dashboard.mock";

export function Dashboard() {
  const { navigate, notify } = useApp();
  const { projects, setActiveProjectById } = useContent();

  const handleOpenProject = (id: string) => {
    setActiveProjectById(id);
    navigate("editor");
  };

  return (
    <>
      <PageHeader
        eyebrow="MONDAY, APRIL 28"
        title="Good morning, Alex"
        subtitle="Here’s what’s happening across your learning content today."
      >
        <button className="btn secondary" onClick={() => navigate("library")} type="button">
          <Library size={16} />
          Browse library
        </button>
        <button className="btn primary" onClick={() => navigate("create")} type="button">
          <Plus size={16} />
          Create content
        </button>
      </PageHeader>

      <div className="demo-note">
        <Sparkles size={15} />
        <span>You’re viewing demonstration workspace data.</span>
        <button type="button" onClick={() => notify("Demonstration mode: all data is stored in memory for testing.")}>
          Learn more
        </button>
      </div>

      <section className="stat-grid">
        {[
          ["Total projects", String(projects.length), "+6 this month", FolderKanban, "blue"],
          ["H5P packages", "31", "64.5% of content", Boxes, "indigo"],
          ["SCORM exports", "126", "+18 this month", FileArchive, "green"],
          ["Active learners", "2,842", "+12.4% vs last month", UsersRound, "violet"],
        ].map(([label, value, hint, Icon, color]) => {
          const IconComp = Icon as typeof FolderKanban;
          return (
            <div className="stat-card" key={label as string}>
              <div className={`stat-icon ${color}`}>
                <IconComp size={19} />
              </div>
              <span>{label as string}</span>
              <strong>{value as string}</strong>
              <small>{hint as string}</small>
            </div>
          );
        })}
      </section>

      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <PanelTitle
            title="Recent projects"
            action="View all"
            onAction={() => navigate("library")}
          />
          <div className="project-list">
            {projects.slice(0, 4).map((p) => (
              <button
                className="project-row"
                key={p.id}
                onClick={() => handleOpenProject(p.id)}
                type="button"
              >
                <ProjectThumb variant={p.color} compact />
                <div className="project-info">
                  <b>{p.title}</b>
                  <span>
                    {p.type} · {p.owner}
                  </span>
                </div>
                <StatusBadge status={p.status} />
                <div className="project-date">
                  <span>Modified</span>
                  <b>{p.date}</b>
                </div>
                <MoreHorizontal size={17} />
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <PanelTitle title="Quick create" />
          <div className="quick-grid">
            {contentTypes.slice(0, 4).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.name}
                  onClick={() => navigate(t.name === "Multiple Choice" ? "quiz" : "editor")}
                  type="button"
                >
                  <div className={`type-icon ${t.color}`}>
                    <Icon size={20} />
                  </div>
                  <span>{t.name}</span>
                  <ChevronRight size={15} />
                </button>
              );
            })}
          </div>
          <button className="text-action" onClick={() => navigate("create")} type="button">
            View all content types <ChevronRight size={14} />
          </button>
        </section>

        <section className="panel performance-panel">
          <PanelTitle title="Export activity" action="Last 30 days" />
          <div className="chart-head">
            <div>
              <strong>126</strong>
              <span>Total exports</span>
            </div>
            <span className="positive">↑ 14.8%</span>
          </div>
          <div className="bar-chart">
            {exportActivityBars.map((v, i) => (
              <i
                key={i}
                style={{ height: `${v * 0.72}px` }}
                className={i === exportActivityBars.length - 1 ? "current" : ""}
              />
            ))}
          </div>
          <div className="chart-labels">
            <span>Apr 1</span>
            <span>Apr 8</span>
            <span>Apr 15</span>
            <span>Apr 22</span>
            <span>Apr 28</span>
          </div>
        </section>

        <section className="panel">
          <PanelTitle
            title="Workspace overview"
            action="Manage"
            onAction={() => navigate("settings")}
          />
          <div className="usage-ring-wrap">
            <div className="usage-ring">
              <div>
                <strong>68%</strong>
                <span>used</span>
              </div>
            </div>
            <div>
              <b>68.2 GB of 100 GB</b>
              <span>Across 238 uploaded files</span>
              <button className="text-action" onClick={() => navigate("media")} type="button">
                View storage details
              </button>
            </div>
          </div>
          <div className="usage-list">
            <div>
              <i className="dot blue" />
              Video <b>38.4 GB</b>
            </div>
            <div>
              <i className="dot indigo" />
              Images <b>18.7 GB</b>
            </div>
            <div>
              <i className="dot slate" />
              Other <b>11.1 GB</b>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
