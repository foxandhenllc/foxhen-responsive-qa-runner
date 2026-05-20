import type { ResponsiveQaReport } from "../lib/reportTypes";
import { reportScore, statusLabel } from "../lib/reportMetrics";

type SummaryCardsProps = {
  report: ResponsiveQaReport;
};

export function SummaryCards({ report }: SummaryCardsProps) {
  const score = reportScore(report);

  return (
    <section id="summary" className="summary-grid" aria-label="Report summary">
      <article className="score-card">
        <span>QA score</span>
        <strong>{score}</strong>
        <p>{statusLabel(report.summary.status)}</p>
      </article>
      <article>
        <span>Viewports</span>
        <strong>{report.summary.checkedViewports}</strong>
        <p>{report.viewports.map((viewport) => viewport.name).join(", ")}</p>
      </article>
      <article>
        <span>Findings</span>
        <strong>{report.summary.totalIssues}</strong>
        <p>
          {report.summary.errorCount} must fix · {report.summary.warningCount} review
        </p>
      </article>
      <article>
        <span>Browser</span>
        <strong>{report.metadata.browser.status}</strong>
        <p>{report.metadata.checks.length} checks configured</p>
      </article>
    </section>
  );
}
