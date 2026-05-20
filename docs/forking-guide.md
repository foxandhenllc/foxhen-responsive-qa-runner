# Responsive QA Runner Forking Guide

Use this guide to adapt the utility without introducing private data or hidden dependencies.

## Public-Safe Sample Scenario

- Service line: Website QA and polish
- Demo promise: Generate a responsive QA report with screenshots, issue checks, and client-readable next steps.
- Fictional sample object: CLI report output
- Runtime: static React/Vite app plus local Playwright CLI; no backend, auth, or external service calls

## Replace First

1. Edit `src/data/sampleReport.ts` with fictional target URLs, findings, selectors, dates, and viewport results.
2. Keep owners and notes generic; do not paste customer logs, emails, credentials, invoices, or screenshots.
3. Run `node bin/qa-runner.mjs <url> --out reports/example --viewports mobile,tablet,desktop` for local QA artifacts.
4. Refresh `docs/demo-screenshot.png` only with sanitized public-safe imagery.

## Buyer Credibility Checklist

- The hero states that this is a responsive QA report viewer and CLI utility.
- The CLI writes JSON + HTML reports and screenshots when Playwright can launch.
- The sample dashboard explains issue severity, viewport evidence, and recommended fixes.
- Browser limitations are visible when Playwright browsers are unavailable.
- `npm test`, `npm run typecheck`, and `npm run build` pass before deploy.

## Starter Adaptation Brief

Fork Responsive QA Runner as a public-safe website QA utility. Keep all report data fictional, update `src/data/sampleReport.ts`, preserve the CLI report-generation flow, and publish only after tests and build pass.
