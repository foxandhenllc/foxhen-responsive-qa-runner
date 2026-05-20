import type { IssueSeverity, ReportIssue, ResponsiveQaReport } from "./reportTypes";

export function formatCheckLabel(check: ReportIssue["check"] | string): string {
  return check
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function severityLabel(severity: IssueSeverity): string {
  if (severity === "error") return "Must fix";
  if (severity === "warning") return "Needs review";
  return "Note";
}

export function statusLabel(status: ResponsiveQaReport["summary"]["status"]): string {
  if (status === "fail") return "Action needed";
  if (status === "review") return "Review findings";
  return "Looks clear";
}

export function issuesForViewport(report: ResponsiveQaReport, viewportName: string): ReportIssue[] {
  return report.issues.filter((issue) => issue.viewport === viewportName || issue.viewport === "all");
}

export function topFindings(report: ResponsiveQaReport): ReportIssue[] {
  const severityWeight: Record<IssueSeverity, number> = { error: 3, warning: 2, info: 1 };
  return [...report.issues]
    .sort((left, right) => severityWeight[right.severity] - severityWeight[left.severity])
    .slice(0, 4);
}

export function reportScore(report: ResponsiveQaReport): number {
  const penalties = report.summary.errorCount * 18 + report.summary.warningCount * 7 + report.summary.infoCount * 2;
  return Math.max(0, Math.min(100, 100 - penalties));
}
