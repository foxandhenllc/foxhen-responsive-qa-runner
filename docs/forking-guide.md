# Responsive QA Runner Forking Guide

Use this guide to adapt the demo without introducing private data or hidden dependencies.

## Public-Safe Sample Scenario

- Service line: Website QA and polish
- Demo promise: Run a simulated visual QA pass with breakpoints, defects, reproduction steps, and acceptance checks.
- Fictional sample object: QA defect board
- Runtime: static React/Vite, no backend, no auth, no external API calls

## Replace First

1. Edit `src/data.ts` titles, owners, notes, dates, theme colors, repository URL, and live demo URL.
2. Keep owners generic such as `Fox & Hen`, `Buyer`, `QA`, or fictional roles.
3. Keep notes written as sanitized examples; do not paste customer logs, emails, credentials, invoices, or screenshots.
4. Refresh `docs/demo-screenshot.png` after visual changes.

## Buyer Credibility Checklist

- The hero states the service outcome in one sentence.
- The board can be searched, sorted, edited, advanced, simulated, and exported.
- QA gates explain what makes the package handoff-ready.
- The generated report is readable by a non-technical buyer.
- `npm run build --silent` passes before deploy.

## Starter Adaptation Brief

Fork Responsive QA Runner as a public-safe client demo for website qa and polish. Keep all records fictional, update `src/data.ts`, preserve the readiness board and export flow, and publish only after the build passes.
