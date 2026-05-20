import type { CheckStatus, IssueSeverity, ResponsiveQaReport } from "./reportTypes";

type ReportImportResult =
  | { ok: true; report: ResponsiveQaReport }
  | { ok: false; error: string };

const summaryStatuses = new Set(["pass", "review", "fail"]);
const browserStatuses = new Set(["available", "unavailable"]);
const issueSeverities = new Set<IssueSeverity>(["error", "warning", "info"]);
const checkStatuses = new Set<CheckStatus>(["pass", "fail", "warn", "skipped"]);
const screenshotStatuses = new Set(["captured", "skipped", "sample-only"]);

export function parseReportJson(rawJson: string): ReportImportResult {
  if (!rawJson.trim()) {
    return { ok: false, error: "Paste or choose a report.json file first." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Report JSON could not be parsed: ${message}` };
  }

  return validateReport(parsed);
}

function validateReport(value: unknown): ReportImportResult {
  if (!isRecord(value)) {
    return { ok: false, error: "Report JSON must be an object." };
  }

  const requiredStringFields: Array<keyof ResponsiveQaReport> = ["schemaVersion", "generatedAt", "title"];
  for (const field of requiredStringFields) {
    if (typeof value[field] !== "string") {
      return { ok: false, error: `Report is missing a string "${field}" field.` };
    }
  }

  if (!isRecord(value.target) || typeof value.target.url !== "string") {
    return { ok: false, error: 'Report is missing a string "target.url" field.' };
  }

  if (!isValidSummary(value.summary)) {
    return { ok: false, error: "Report summary is missing status and issue counts." };
  }

  if (!isValidMetadata(value.metadata)) {
    return { ok: false, error: "Report metadata is missing runner, browser, or checks data." };
  }

  if (!Array.isArray(value.viewports) || !value.viewports.every(isValidViewport)) {
    return { ok: false, error: "Report viewports must match the qa-runner report format." };
  }

  if (!Array.isArray(value.issues) || !value.issues.every(isValidIssue)) {
    return { ok: false, error: "Report issues must match the qa-runner report format." };
  }

  return { ok: true, report: value as ResponsiveQaReport };
}

function isValidSummary(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.status === "string" &&
    summaryStatuses.has(value.status) &&
    isNumber(value.checkedViewports) &&
    isNumber(value.totalIssues) &&
    isNumber(value.errorCount) &&
    isNumber(value.warningCount) &&
    isNumber(value.infoCount)
  );
}

function isValidMetadata(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.browser)) {
    return false;
  }

  return (
    typeof value.runner === "string" &&
    typeof value.outputDirectory === "string" &&
    typeof value.browser.status === "string" &&
    browserStatuses.has(value.browser.status) &&
    (value.browser.limitation === undefined || typeof value.browser.limitation === "string") &&
    Array.isArray(value.checks) &&
    value.checks.every((check) => typeof check === "string")
  );
}

function isValidViewport(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.checks) || !isRecord(value.checks.overflow) || !isRecord(value.checks.contrast)) {
    return false;
  }

  return (
    typeof value.name === "string" &&
    isNumber(value.width) &&
    isNumber(value.height) &&
    (value.screenshot === null || typeof value.screenshot === "string") &&
    typeof value.screenshotStatus === "string" &&
    screenshotStatuses.has(value.screenshotStatus) &&
    isCheckStatus(value.checks.overflow.status) &&
    isCheckStatus(value.checks.contrast.status)
  );
}

function isValidIssue(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.check === "string" &&
    typeof value.severity === "string" &&
    issueSeverities.has(value.severity as IssueSeverity) &&
    typeof value.viewport === "string" &&
    typeof value.message === "string" &&
    typeof value.help === "string" &&
    (value.selector === undefined || typeof value.selector === "string") &&
    (value.evidence === undefined || Array.isArray(value.evidence))
  );
}

function isCheckStatus(value: unknown): value is CheckStatus {
  return typeof value === "string" && checkStatuses.has(value as CheckStatus);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
