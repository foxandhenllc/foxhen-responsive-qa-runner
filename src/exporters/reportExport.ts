import type { ResponsiveQaReport } from "../lib/reportTypes";
import { formatCheckLabel } from "../lib/reportMetrics";

export function buildClientBrief(report: ResponsiveQaReport): string {
  const priorityFindings = report.issues.slice(0, 5).map((issue, index) => {
    return `${index + 1}. ${formatCheckLabel(issue.check)} (${issue.severity}) — ${issue.message}`;
  });

  return [
    `Responsive QA brief for ${report.target.url}`,
    `Status: ${report.summary.status}`,
    `Viewports checked: ${report.viewports.map((viewport) => viewport.name).join(", ")}`,
    `Issue count: ${report.summary.totalIssues}`,
    "",
    "Priority findings:",
    ...priorityFindings,
    "",
    "Client-safe next step: confirm which findings should be fixed first, then rerun the CLI after changes.",
  ].join("\n");
}

export function downloadReportJson(report: ResponsiveQaReport, filename = "foxhen-responsive-qa-report.json"): void {
  const payload = JSON.stringify(report, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
