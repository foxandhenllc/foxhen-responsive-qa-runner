import type { IssueSeverity, ReportIssue } from "../lib/reportTypes";
import { formatCheckLabel, severityLabel } from "../lib/reportMetrics";

type FindingFilter = IssueSeverity | "all";

type FindingsPanelProps = {
  issues: ReportIssue[];
  filter: FindingFilter;
  selectedIssue: ReportIssue;
  onFilterChange: (filter: FindingFilter) => void;
  onSelectIssue: (issueId: string) => void;
};

const filters: FindingFilter[] = ["all", "error", "warning", "info"];

export function FindingsPanel({ issues, filter, selectedIssue, onFilterChange, onSelectIssue }: FindingsPanelProps) {
  return (
    <section id="findings" className="findings-layout">
      <div className="findings-list">
        <div className="section-heading compact">
          <p>Findings</p>
          <h2>Prioritized defects with clear fix guidance.</h2>
        </div>
        <div className="filter-row" aria-label="Filter findings">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? "active" : ""}
              onClick={() => onFilterChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="issue-stack">
          {issues.map((issue) => (
            <button
              key={issue.id}
              type="button"
              className={issue.id === selectedIssue.id ? "issue-card selected" : "issue-card"}
              onClick={() => onSelectIssue(issue.id)}
            >
              <span className={`severity ${issue.severity}`}>{severityLabel(issue.severity)}</span>
              <strong>{issue.message}</strong>
              <small>
                {formatCheckLabel(issue.check)} · {issue.viewport}
              </small>
            </button>
          ))}
        </div>
      </div>
      <aside className="issue-detail" aria-label="Selected finding detail">
        <span className={`severity ${selectedIssue.severity}`}>{selectedIssue.severity}</span>
        <h3>{formatCheckLabel(selectedIssue.check)}</h3>
        <p className="issue-message">{selectedIssue.message}</p>
        {selectedIssue.selector ? (
          <div className="selector-chip">
            <span>Selector</span>
            <code>{selectedIssue.selector}</code>
          </div>
        ) : null}
        <div className="repair-note">
          <span>Recommended fix</span>
          <p>{selectedIssue.help}</p>
        </div>
        {selectedIssue.evidence?.length ? (
          <div className="evidence-list">
            <span>Evidence</span>
            {selectedIssue.evidence.map((item) => (
              <code key={JSON.stringify(item)}>{JSON.stringify(item)}</code>
            ))}
          </div>
        ) : null}
      </aside>
    </section>
  );
}

export type { FindingFilter };
