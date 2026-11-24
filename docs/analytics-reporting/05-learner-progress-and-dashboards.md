# Learner Progress & Analytics Dashboards Specification

## 1. Overview

The `AnalyticsService` computes aggregated metrics and renders live engagement dashboards via `Analytics.tsx` while strictly preserving Figma Make layout, styling, and visual tokens.

```mermaid
graph TD
    subgraph UI ["Analytics View Surface (.analytics-grid)"]
        KPIs["analytics-stats: 4 Metric Cards (Total, Completion, Score, Hours)"]
        LineChart["line-chart: Engagement Curve over Time (Weekly / Monthly)"]
        Donut["donut-wrap: Format Breakdown (SCORM 2004, SCORM 1.2, H5P)"]
        Table["data-table: Content Breakdown (Learners, Completion, Score, Time)"]
    end

    subgraph Service ["Analytics Aggregator"]
        Attempts["PostgreSQL learning_attempts Aggregator"]
        Learners["PostgreSQL learners Aggregator"]
        CSVGen["CSV Exporter: Regulatory Audit Format"]
    end

    Attempts --> Service
    Learners --> Service
    Service --> UI
```

---

## 2. Core KPI Definitions

1. **Total Learners**: Unique learners registered across the organization's published courses.
2. **Average Completion Rate**:
   $$\text{Completion Rate } \% = \left(\frac{N_{\text{completed attempts}}}{N_{\text{total attempts}}}\right) \times 100$$
3. **Average Score**: Mean raw percentage score achieved across all completed assessment sessions.
4. **Learning Hours**: Total accumulated learning duration expressed in hours:
   $$\text{Learning Hours} = \frac{\sum t_{\text{session seconds}}}{3600}$$

---

## 3. CSV Regulatory Audit Export

- **Endpoint**: `GET /api/v1/analytics/export/csv`
- Generates standard CSV reports formatted for accreditation reviews and corporate compliance audits.
- Includes header metadata, KPI summaries, detailed content performance rankings, and package format distributions.
