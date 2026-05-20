import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import http from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "..");
const appPort = 4175;
const appUrl = `http://127.0.0.1:${appPort}`;

const fileImportedReport = createReport({
  url: "https://file-imported.example/client-home",
  message: "File imported report finding is visible.",
  id: "missing-alt-file-imported-logo",
});

const pastedImportedReport = createReport({
  url: "https://imported.example/client-home",
  message: "Imported report finding is visible.",
  id: "missing-alt-imported-logo",
});

function createReport({ url, message, id }) {
  return {
    schemaVersion: "1.0.0",
    generatedAt: "2026-05-20T16:00:00.000Z",
    title: "Imported client QA report",
    target: {
      url,
    },
    summary: {
      status: "review",
      checkedViewports: 1,
      totalIssues: 1,
      errorCount: 0,
      warningCount: 1,
      infoCount: 0,
    },
    metadata: {
      runner: "foxhen-responsive-qa-runner",
      outputDirectory: "reports/imported-client",
      browser: {
        status: "unavailable",
        limitation: "Static smoke fixture",
      },
      checks: ["missing-alt"],
    },
    viewports: [
      {
        name: "mobile",
        width: 390,
        height: 844,
        screenshot: null,
        screenshotStatus: "skipped",
        checks: {
          overflow: {
            status: "skipped",
            reason: "Requires a launched Playwright browser.",
          },
          contrast: {
            status: "skipped",
            reason: "Requires computed browser styles.",
          },
        },
      },
    ],
    issues: [
      {
        id,
        check: "missing-alt",
        severity: "warning",
        viewport: "all",
        selector: "img.logo",
        message,
        help: "Add useful alt text before client handoff.",
      },
    ],
  };
}

test("app imports file and pasted JSON, exports the active report, and returns to sample data", async (t) => {
  const browser = await launchBrowserOrSkip(t);
  if (!browser) return;

  const server = await startViteServer();
  t.after(async () => {
    server.kill("SIGTERM");
    await browser.close();
  });

  const context = await browser.newContext({ acceptDownloads: true });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: appUrl });
  const page = await context.newPage();
  await page.goto(appUrl);

  await page.getByLabel("Import report.json file").setInputFiles({
    name: "report.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fileImportedReport, null, 2)),
  });
  await page.getByText("Report loaded from report.json.").waitFor({ state: "visible" });
  await page.locator(".report-meta-list").getByText(fileImportedReport.target.url).waitFor({ state: "visible" });

  await page.getByLabel("Paste report JSON").fill(JSON.stringify(pastedImportedReport, null, 2));
  await page.getByRole("button", { name: "Load pasted JSON" }).click();

  await page.getByText("Report loaded from pasted JSON.").waitFor({ state: "visible" });
  await page.locator(".report-meta-list").getByText(pastedImportedReport.target.url).waitFor({ state: "visible" });
  await page.getByRole("button", { name: /Imported report finding is visible/ }).waitFor({ state: "visible" });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download active JSON" }).click(),
  ]);
  assert.match(download.suggestedFilename(), /foxhen-responsive-qa-report\.json$/);
  const downloadedReport = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(downloadedReport.target.url, pastedImportedReport.target.url);

  await page.getByRole("button", { name: "Copy client brief" }).click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /https:\/\/imported\.example\/client-home/);

  await page.getByRole("button", { name: "Use sample data" }).click();
  await page.getByText("Sample report loaded.").waitFor({ state: "visible" });
  await page.locator(".report-meta-list").getByText("https://example.test/fictional-homepage").waitFor({ state: "visible" });
});

async function launchBrowserOrSkip(t) {
  try {
    return await chromium.launch();
  } catch (error) {
    t.skip(`Chromium is unavailable for app smoke testing: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function startViteServer() {
  const server = spawn(
    process.execPath,
    [join(repoRoot, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", String(appPort), "--strictPort"],
    {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let logs = "";
  server.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });

  await waitForServer(server, () => logs);
  return server;
}

async function waitForServer(server, readLogs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20_000) {
    if (server.exitCode !== null) {
      throw new Error(`Vite exited before serving the app.\n${readLogs()}`);
    }

    if (await canReachApp()) {
      return;
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }

  server.kill("SIGTERM");
  throw new Error(`Timed out waiting for Vite to serve ${appUrl}.\n${readLogs()}`);
}

async function canReachApp() {
  return new Promise((resolveReachable) => {
    const request = http.get(appUrl, (response) => {
      response.resume();
      resolveReachable(response.statusCode === 200);
    });
    request.on("error", () => resolveReachable(false));
    request.setTimeout(1_000, () => {
      request.destroy();
      resolveReachable(false);
    });
  });
}
