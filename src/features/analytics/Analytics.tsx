import { useState } from "react";
import { Download, Clock3, ChevronDown } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { PanelTitle } from "../../components/ui/PanelTitle";
import { ProjectThumb } from "../../components/ui/ProjectThumb";
import { AnalyticsService } from "../../services/analytics.service";
import { analyticsKpis, formatCompletionData, topPerformingContent } from "../../mocks/analytics.mock";

export function Analytics() {
  const { notify } = useApp();
  const [timeRange, setTimeRange] = useState("Last 30 days");
  const [chartInterval, setChartInterval] = useState("Weekly");

  return (
    <>
      <PageHeader
        title="Learning analytics"
        subtitle="Understand engagement and performance across your content."
      >
        <button
          className="btn secondary"
          onClick={async () => {
            await AnalyticsService.exportCsvReport();
            notify("Analytics CSV compliance report exported");
          }}
          type="button"
        >
          <Download size={16} />
          Export report
        </button>
        <button
          className="btn secondary"
          onClick={() => {
            const next = timeRange === "Last 30 days" ? "Last 90 days" : "Last 30 days";
            setTimeRange(next);
            notify(`Showing data for ${next}`);
          }}
          type="button"
        >
          <Clock3 size={16} />
          {timeRange}
          <ChevronDown size={14} />
        </button>
      </PageHeader>

      <div className="analytics-stats">
        {analyticsKpis.map((kpi) => {
          const IconComp = kpi.icon;
          return (
            <div className="stat-card" key={kpi.label}>
              <div className="stat-line">
                <span>{kpi.label}</span>
                <IconComp size={18} />
              </div>
              <strong>{kpi.value}</strong>
              <small className="positive">↑ {kpi.change} vs previous period</small>
            </div>
          );
        })}
      </div>

      <div className="analytics-grid">
        <section className="panel wide">
          <PanelTitle
            title="Learner engagement"
            action={chartInterval}
            onAction={() => {
              const next = chartInterval === "Weekly" ? "Monthly" : "Weekly";
              setChartInterval(next);
              notify(`Switched chart grouping to ${next}`);
            }}
          />
          <div className="line-chart">
            <div className="y-labels">
              <span>3k</span>
              <span>2k</span>
              <span>1k</span>
              <span>0</span>
            </div>
            <div className="chart-plot">
              <i />
              <i />
              <i />
              <svg viewBox="0 0 600 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity=".22" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,145 C55,132 72,125 110,130 S185,92 235,108 S310,55 365,75 S440,45 490,58 S555,26 600,34 L600,180 L0,180Z"
                  fill="url(#fill)"
                />
                <path
                  d="M0,145 C55,132 72,125 110,130 S185,92 235,108 S310,55 365,75 S440,45 490,58 S555,26 600,34"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                />
              </svg>
              <div className="x-labels">
                <span>Apr 1</span>
                <span>Apr 8</span>
                <span>Apr 15</span>
                <span>Apr 22</span>
                <span>Apr 28</span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <PanelTitle title="Completion by format" />
          <div className="donut-wrap">
            <div className="donut">
              <span>
                78.6%<small>average</small>
              </span>
            </div>
            <div className="donut-legend">
              {formatCompletionData.map((f) => (
                <span key={f.format}>
                  <i className={f.color} />
                  {f.format} <b>{f.percentage}%</b>
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <PanelTitle
          title="Top performing content"
          action="View full report"
          onAction={() => notify("Full course performance telemetry report")}
        />
        <div className="data-table">
          <div className="table-row header">
            <span>Content</span>
            <span>Learners</span>
            <span>Completion</span>
            <span>Avg. score</span>
            <span>Learning time</span>
          </div>
          {topPerformingContent.map((item) => (
            <div className="table-row" key={item.id}>
              <span>
                <ProjectThumb variant={item.color} compact />
                <b>{item.title}</b>
              </span>
              <span>{item.learnersCount}</span>
              <span>
                <div className="mini-progress">
                  <i style={{ width: `${item.completionRate}%` }} />
                </div>
                {item.completionRate}%
              </span>
              <span>{item.averageScore}%</span>
              <span>{item.learningTime}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
