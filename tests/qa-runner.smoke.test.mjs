import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "..");
const fixtureUrl = pathToFileURL(join(testDir, "fixtures", "qa-page.html")).href;
const outputDir = join(repoRoot, "reports", ".smoke-test");
const staticOutputDir = join(repoRoot, "reports", ".static-smoke-test");

test("qa runner writes JSON and HTML reports from a local fixture", async () => {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["bin/qa-runner.mjs", fixtureUrl, "--out", outputDir, "--viewports", "mobile,desktop"],
    { cwd: repoRoot },
  );

  assert.equal(stderr, "", "smoke run should not write to stderr");
  assert.match(stdout, /report\.json/);
  assert.ok(existsSync(join(outputDir, "report.json")), "JSON report should be written");
  assert.ok(existsSync(join(outputDir, "index.html")), "HTML report should be written");

  const report = JSON.parse(await readFile(join(outputDir, "report.json"), "utf8"));
  const html = await readFile(join(outputDir, "index.html"), "utf8");

  assert.equal(report.target.url, fixtureUrl);
  assert.deepEqual(
    report.viewports.map((viewport) => viewport.name),
    ["mobile", "desktop"],
  );
  assert.equal(report.summary.checkedViewports, 2);
  assert.ok(report.issues.some((issue) => issue.check === "missing-alt"));
  assert.ok(report.issues.some((issue) => issue.check === "heading-order"));
  assert.match(html, /Responsive QA report/);

  if (report.metadata.browser.status === "available") {
    for (const viewport of report.viewports) {
      assert.ok(viewport.screenshot, `${viewport.name} should include a screenshot path`);
      assert.ok(existsSync(join(outputDir, viewport.screenshot)), `${viewport.name} screenshot should exist`);
    }
  } else {
    assert.equal(report.metadata.browser.status, "unavailable");
    assert.match(report.metadata.browser.limitation, /Playwright/i);
  }

  await rm(outputDir, { recursive: true, force: true });
});

test("qa runner reports Playwright limitation during static fallback", async () => {
  await rm(staticOutputDir, { recursive: true, force: true });
  await mkdir(staticOutputDir, { recursive: true });

  await execFileAsync(
    process.execPath,
    ["bin/qa-runner.mjs", fixtureUrl, "--out", staticOutputDir, "--viewports", "mobile"],
    {
      cwd: repoRoot,
      env: { ...process.env, FOXHEN_QA_FORCE_STATIC: "1" },
    },
  );

  const report = JSON.parse(await readFile(join(staticOutputDir, "report.json"), "utf8"));

  assert.equal(report.metadata.browser.status, "unavailable");
  assert.match(report.metadata.browser.limitation, /Playwright/i);
  assert.equal(report.viewports[0].screenshotStatus, "skipped");
  assert.ok(report.issues.some((issue) => issue.check === "browser"));
  assert.ok(report.issues.some((issue) => issue.check === "missing-alt"));

  await rm(staticOutputDir, { recursive: true, force: true });
});
