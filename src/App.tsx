import { useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { FindingsPanel, type FindingFilter } from "./components/FindingsPanel";
import { PublicSafetyPanel } from "./components/PublicSafetyPanel";
import { SummaryCards } from "./components/SummaryCards";
import { ViewportEvidence } from "./components/ViewportEvidence";
import { sampleReport } from "./data/sampleReport";
import { buildClientBrief, downloadReportJson } from "./exporters/reportExport";
import { topFindings } from "./lib/reportMetrics";
import type { ReportIssue } from "./lib/reportTypes";
import "./styles.css";

export function App() {
  const [filter, setFilter] = useState<FindingFilter>("all");
  const [selectedIssueId, setSelectedIssueId] = useState(sampleReport.issues[0].id);
  const [copied, setCopied] = useState(false);

  const filteredIssues = useMemo(() => {
    return filter === "all" ? sampleReport.issues : sampleReport.issues.filter((issue) => issue.severity === filter);
  }, [filter]);

  const selectedIssue = useMemo<ReportIssue>(() => {
    return filteredIssues.find((issue) => issue.id === selectedIssueId) ?? filteredIssues[0] ?? sampleReport.issues[0];
  }, [filteredIssues, selectedIssueId]);

  const priorityFindings = useMemo(() => topFindings(sampleReport), []);

  async function copyClientBrief() {
    const brief = buildClientBrief(sampleReport);
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <div className="app-shell">
      <AppHeader report={sampleReport} />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Fox &amp; Hen flagship utility</p>
            <h1>Responsive QA reports buyers can actually read.</h1>
            <p className="lede">
              Run the local Playwright CLI, capture breakpoint evidence, and hand clients a clean JSON + HTML report without
              accounts, secrets, or private customer data.
            </p>
            <div className="hero-actions">
              <button type="button" className="primary-action" onClick={() => downloadReportJson(sampleReport)}>
                Download sample JSON
              </button>
              <button type="button" className="secondary-action" onClick={copyClientBrief}>
                {copied ? "Brief copied" : "Copy client brief"}
              </button>
            </div>
          </div>
          <aside className="hero-console" aria-label="Sample report status">
            <span className={`report-status ${sampleReport.summary.status}`}>{sampleReport.summary.status}</span>
            <strong>{sampleReport.summary.totalIssues}</strong>
            <p>sample findings across mobile, tablet, and desktop.</p>
            <div className="top-findings">
              {priorityFindings.map((issue) => (
                <span key={issue.id}>{issue.message}</span>
              ))}
            </div>
          </aside>
        </section>

        <SummaryCards report={sampleReport} />
        <ViewportEvidence report={sampleReport} />
        <FindingsPanel
          issues={filteredIssues}
          filter={filter}
          selectedIssue={selectedIssue}
          onFilterChange={setFilter}
          onSelectIssue={setSelectedIssueId}
        />
        <PublicSafetyPanel />
      </main>
    </div>
  );
}
