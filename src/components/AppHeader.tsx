import type { ResponsiveQaReport } from "../lib/reportTypes";

type AppHeaderProps = {
  report: ResponsiveQaReport;
};

export function AppHeader({ report }: AppHeaderProps) {
  return (
    <header className="site-header">
      <a className="brand" href="https://foxandhenllc.com" aria-label="Fox and Hen website">
        <span className="brand-mark">F&amp;H</span>
        <span>
          <strong>Responsive QA Runner</strong>
          <small>{report.metadata.runner}</small>
        </span>
      </a>
      <nav aria-label="Report sections">
        <a href="#import">Import</a>
        <a href="#summary">Summary</a>
        <a href="#evidence">Evidence</a>
        <a href="#findings">Findings</a>
        <a className="nav-button" href="#cli">CLI usage</a>
      </nav>
    </header>
  );
}
