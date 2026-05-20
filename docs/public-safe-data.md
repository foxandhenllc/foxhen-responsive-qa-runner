# Public-Safe Data Policy

This repo is designed to be safe as a public sample and client-facing utility.

## Allowed

- Fictional URLs such as `https://example.test/fictional-homepage`.
- Local HTML fixtures created only for QA testing.
- Sanitized screenshots from public pages or mock pages.
- Generic owner labels such as `Fox & Hen`, `QA`, `Client reviewer`, or `Developer`.
- Reproducible issue descriptions that explain the problem without naming a private customer.

## Not Allowed

- Credentials, API keys, session cookies, bearer tokens, or `.env` values.
- Private customer URLs, unpublished launches, invoices, email addresses, or contact lists.
- Screenshots of authenticated dashboards, admin panels, private analytics, or customer files.
- Raw customer bug reports, Slack threads, emails, or support logs.
- Real names unless the person has approved public use.

## Before Publishing A Report

1. Open `report.json` and search for private domains, names, emails, tokens, and internal notes.
2. Review `index.html` in a browser and inspect every screenshot.
3. Confirm the output folder contains only report artifacts intended for sharing.
4. Keep generated `reports/` folders out of git unless a sanitized sample is intentionally added.
5. Re-run `npm test`, `npm run typecheck`, and `npm run build` before handoff.

## Browser Limitations

If Playwright browsers are not installed, the CLI falls back to static checks where possible and records that limitation in `metadata.browser`. Treat fallback reports as triage notes, not as screenshot-backed QA evidence.
