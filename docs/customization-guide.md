# Customization Guide

Use this guide to adapt Responsive QA Runner for a public-safe client demo or internal QA workflow.

## 1. Update The Sample Report Viewer

- Edit `src/data/sampleReport.ts` with fictional target URLs, findings, and viewport results.
- Keep `schemaVersion`, `summary`, `metadata`, `viewports`, and `issues` aligned with the CLI output shape.
- Use realistic selectors and messages, but avoid private customer copy.

## 2. Adjust Branding

- Update colors, radii, spacing, and dashboard styling in `src/styles.css`.
- Keep the app static and readable; do not add backend calls, auth, analytics, or external data dependencies.
- Replace `docs/demo-screenshot.png` only with a sanitized screenshot.

## 3. Run A Local QA Report

```bash
node bin/qa-runner.mjs https://example.com --out reports/example --viewports mobile,tablet,desktop
```

Custom viewport sizes are supported:

```bash
node bin/qa-runner.mjs ./tests/fixtures/qa-page.html --out reports/custom --viewports 390x844,1024x768,1440x1000
```

## 4. Extend Checks Carefully

- Add browser-computed checks in `bin/qa-runner.mjs` when they require layout, styles, screenshots, or navigation.
- Keep static fallback behavior useful for local fixture smoke tests.
- Use `FOXHEN_QA_FORCE_STATIC=1 npm test` when you need to exercise the no-browser fallback path directly.
- Add or update `tests/qa-runner.smoke.test.mjs` before changing report behavior.

## 5. Prepare A Client Handoff

- Share `reports/example/index.html` for human review.
- Share `reports/example/report.json` when another system needs structured output.
- Use `docs/client-brief-template.md` to summarize scope, findings, limitations, and next steps.
