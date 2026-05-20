import { useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { FindingsPanel, type FindingFilter } from "./components/FindingsPanel";
import { PublicSafetyPanel } from "./components/PublicSafetyPanel";
import { ReportImportPanel, type ImportStatus, type ReportSource } from "./components/ReportImportPanel";
import { SummaryCards } from "./components/SummaryCards";
import { ViewportEvidence } from "./components/ViewportEvidence";
import { sampleReport } from "./data/sampleReport";
import { buildClientBrief, downloadReportJson } from "./exporters/reportExport";
import { parseReportJson } from "./lib/reportImport";
import { topFindings } from "./lib/reportMetrics";
import type { ReportIssue, ResponsiveQaReport } from "./lib/reportTypes";
import "./styles.css";

const sampleSource: ReportSource = {
  kind: "sample",
  label: "Sample report",
};

export function App() {
  const [activeReport, setActiveReport] = useState<ResponsiveQaReport>(sampleReport);
  const [reportSource, setReportSource] = useState<ReportSource>(sampleSource);
  const [pastedJson, setPastedJson] = useState("");
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    tone: "info",
    message: "Sample report loaded.",
  });
  const [filter, setFilter] = useState<FindingFilter>("all");
  const [selectedIssueId, setSelectedIssueId] = useState(sampleReport.issues[0].id);
  const [copied, setCopied] = useState(false);

  const filteredIssues = useMemo(() => {
    return filter === "all" ? activeReport.issues : activeReport.issues.filter((issue) => issue.severity === filter);
  }, [activeReport, filter]);

  const selectedIssue = useMemo<ReportIssue | undefined>(() => {
    return filteredIssues.find((issue) => issue.id === selectedIssueId) ?? filteredIssues[0];
  }, [filteredIssues, selectedIssueId]);

  const priorityFindings = useMemo(() => topFindings(activeReport), [activeReport]);

  async function copyClientBrief() {
    const brief = buildClientBrief(activeReport);
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      return;
    }

    setImportStatus({
      tone: "error",
      message: "Clipboard access is unavailable in this browser. Select and copy the downloaded brief manually.",
    });
  }

  function loadReport(rawJson: string, source: ReportSource, successMessage: string) {
    const result = parseReportJson(rawJson);
    if (!result.ok) {
      setImportStatus({ tone: "error", message: result.error });
      return;
    }

    setActiveReport(result.report);
    setReportSource(source);
    setFilter("all");
    setSelectedIssueId(result.report.issues[0]?.id ?? "");
    setCopied(false);
    setImportStatus({ tone: "success", message: successMessage });
  }

  async function loadReportFile(file: File) {
    try {
      const rawJson = await file.text();
      setPastedJson(rawJson);
      loadReport(rawJson, { kind: "file", label: file.name }, `Report loaded from ${file.name}.`);
    } catch (error) {
      setImportStatus({
        tone: "error",
        message: `Report file could not be read: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  function useSampleData() {
    setActiveReport(sampleReport);
    setReportSource(sampleSource);
    setPastedJson("");
    setFilter("all");
    setSelectedIssueId(sampleReport.issues[0]?.id ?? "");
    setCopied(false);
    setImportStatus({ tone: "info", message: "Sample report loaded." });
  }

  return (
    <div className="app-shell">
      <AppHeader report={activeReport} />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Fox &amp; Hen flagship utility</p>
            <h1>Responsive QA reports you can load, read, and share.</h1>
            <p className="lede">
              Run the local Playwright CLI, then import its report.json here for a client-ready static dashboard without
              accounts, secrets, uploads, or private customer data.
            </p>
            <div className="hero-actions">
              <button type="button" className="primary-action" onClick={() => downloadReportJson(activeReport)}>
                Download active JSON
              </button>
              <button type="button" className="secondary-action" onClick={copyClientBrief}>
                {copied ? "Brief copied" : "Copy client brief"}
              </button>
            </div>
          </div>
          <aside className="hero-console" aria-label="Active report status">
            <span className={`report-status ${activeReport.summary.status}`}>{activeReport.summary.status}</span>
            <strong>{activeReport.summary.totalIssues}</strong>
            <p>
              {reportSource.kind === "sample"
                ? "sample findings across demo viewports."
                : "active findings across loaded viewports."}
            </p>
            <dl className="report-meta-list">
              <div>
                <dt>Target</dt>
                <dd>{activeReport.target.url}</dd>
              </div>
              <div>
                <dt>Generated</dt>
                <dd>{new Date(activeReport.generatedAt).toLocaleString()}</dd>
              </div>
            </dl>
            <div className="top-findings">
              {priorityFindings.length > 0 ? (
                priorityFindings.map((issue) => <span key={issue.id}>{issue.message}</span>)
              ) : (
                <span>No priority findings in this report.</span>
              )}
            </div>
          </aside>
        </section>

        <ReportImportPanel
          pastedJson={pastedJson}
          source={reportSource}
          status={importStatus}
          onPastedJsonChange={setPastedJson}
          onLoadPastedJson={() =>
            loadReport(pastedJson, { kind: "pasted", label: "Pasted JSON" }, "Report loaded from pasted JSON.")
          }
          onLoadFile={loadReportFile}
          onUseSample={useSampleData}
        />
        <SummaryCards report={activeReport} />
        <ViewportEvidence report={activeReport} />
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
