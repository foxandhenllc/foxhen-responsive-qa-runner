import type { ResponsiveQaReport, ViewportReport } from "../lib/reportTypes";
import { issuesForViewport } from "../lib/reportMetrics";

type ViewportEvidenceProps = {
  report: ResponsiveQaReport;
};

export function ViewportEvidence({ report }: ViewportEvidenceProps) {
  return (
    <section id="evidence" className="panel-section">
      <div className="section-heading">
        <p>Viewport evidence</p>
        <h2>Breakpoints are reviewed as separate handoff surfaces.</h2>
      </div>
      <div className="viewport-grid">
        {report.viewports.map((viewport) => (
          <ViewportCard key={viewport.name} viewport={viewport} issueCount={issuesForViewport(report, viewport.name).length} />
        ))}
      </div>
    </section>
  );
}

type ViewportCardProps = {
  viewport: ViewportReport;
  issueCount: number;
};

function ViewportCard({ viewport, issueCount }: ViewportCardProps) {
  const overflowStatus = viewport.checks.overflow.status;
  const contrastStatus = viewport.checks.contrast.status;

  return (
    <article className="viewport-card">
      <div className="viewport-preview" aria-label={`${viewport.name} sample screenshot`}>
        <span>{viewport.name}</span>
        <strong>
          {viewport.width}×{viewport.height}
        </strong>
        <small>{viewport.screenshot ? "Screenshot captured" : "Fixture preview"}</small>
      </div>
      <div className="viewport-body">
        <div>
          <h3>{viewport.name}</h3>
          <p>{issueCount} relevant findings</p>
        </div>
        <dl>
          <div>
            <dt>Overflow</dt>
            <dd className={`status-dot ${overflowStatus}`}>{overflowStatus}</dd>
          </div>
          <div>
            <dt>Contrast</dt>
            <dd className={`status-dot ${contrastStatus}`}>{contrastStatus}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
