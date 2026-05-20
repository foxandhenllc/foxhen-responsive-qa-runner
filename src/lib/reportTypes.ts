export type IssueSeverity = "error" | "warning" | "info";

export type CheckStatus = "pass" | "fail" | "warn" | "skipped";

export type BrowserStatus = {
  status: "available" | "unavailable";
  limitation?: string;
};

export type ReportCheck =
  | "horizontal-overflow"
  | "missing-alt"
  | "heading-order"
  | "broken-link"
  | "contrast"
  | "browser"
  | (string & {});

export type ReportIssue = {
  id: string;
  check: ReportCheck;
  severity: IssueSeverity;
  viewport: string;
  selector?: string;
  message: string;
  help: string;
  evidence?: Array<Record<string, string | number | boolean | null>>;
};

export type ViewportReport = {
  name: string;
  width: number;
  height: number;
  screenshot: string | null;
  screenshotStatus: "captured" | "skipped" | "sample-only";
  checks: {
    overflow: {
      status: CheckStatus;
      viewportWidth?: number;
      scrollWidth?: number;
      flaggedElements?: number;
      reason?: string;
    };
    contrast: {
      status: CheckStatus;
      checkedElements?: number;
      violations?: number;
      reason?: string;
    };
  };
};

export type ResponsiveQaReport = {
  schemaVersion: string;
  generatedAt: string;
  title: string;
  target: {
    url: string;
  };
  summary: {
    status: "pass" | "review" | "fail";
    checkedViewports: number;
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  metadata: {
    runner: string;
    outputDirectory: string;
    browser: BrowserStatus;
    checks: string[];
  };
  viewports: ViewportReport[];
  issues: ReportIssue[];
};
