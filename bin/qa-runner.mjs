#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

const viewportPresets = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 1000 },
};

const severityRank = {
  error: 3,
  warning: 2,
  info: 1,
};

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    await mkdir(options.outDir, { recursive: true });
    await mkdir(join(options.outDir, "screenshots"), { recursive: true });

    const targetUrl = resolveTargetUrl(options.target);
    const report = await buildReport(targetUrl, options);
    const jsonPath = join(options.outDir, "report.json");
    const htmlPath = join(options.outDir, "index.html");

    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeFile(htmlPath, buildHtmlReport(report), "utf8");

    console.log(`Responsive QA report written:\n- ${jsonPath}\n- ${htmlPath}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

function parseArguments(argv) {
  const options = {
    target: "",
    outDir: "reports/example",
    viewports: ["mobile", "tablet", "desktop"],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }
    if (token === "--out") {
      options.outDir = argv[index + 1] ? resolve(argv[index + 1]) : "";
      index += 1;
      continue;
    }
    if (token === "--viewports") {
      options.viewports = parseViewportList(argv[index + 1] ?? "");
      index += 1;
      continue;
    }
    if (!token.startsWith("--") && !options.target) {
      options.target = token;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!options.target) {
    throw new Error("Usage: node bin/qa-runner.mjs <url> --out reports/example --viewports mobile,tablet,desktop");
  }
  if (!options.outDir) {
    throw new Error("--out requires a directory path");
  }

  return options;
}

function printHelp() {
  console.log(`Responsive QA Runner

Usage:
  node bin/qa-runner.mjs <url> --out reports/example --viewports mobile,tablet,desktop

Options:
  --out <dir>              Directory for report.json, index.html, and screenshots
  --viewports <list>       Comma-separated presets or WIDTHxHEIGHT values
`);
}

function parseViewportList(value) {
  const names = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (names.length === 0) {
    throw new Error("--viewports requires at least one viewport");
  }

  return names.map((name) => {
    if (viewportPresets[name]) {
      return { name, ...viewportPresets[name] };
    }

    const match = name.match(/^(\d{3,5})x(\d{3,5})$/i);
    if (!match) {
      throw new Error(`Unknown viewport "${name}". Use mobile, tablet, desktop, or WIDTHxHEIGHT.`);
    }

    return {
      name: `${match[1]}x${match[2]}`,
      width: Number(match[1]),
      height: Number(match[2]),
    };
  });
}

function resolveTargetUrl(target) {
  if (/^(https?:|file:)/i.test(target)) {
    return target;
  }

  return pathToFileURL(resolve(target)).href;
}

async function buildReport(targetUrl, options) {
  const generatedAt = new Date().toISOString();

  try {
    if (process.env.FOXHEN_QA_FORCE_STATIC === "1") {
      throw new Error("Playwright was intentionally skipped with FOXHEN_QA_FORCE_STATIC=1");
    }

    const playwrightReport = await buildPlaywrightReport(targetUrl, options);
    return finalizeReport({
      ...playwrightReport,
      generatedAt,
      targetUrl,
      outDir: options.outDir,
    });
  } catch (error) {
    const limitation = `Playwright was not available for browser screenshots and live layout checks (${error instanceof Error ? error.message : String(error)}). Static HTML checks ran where possible.`;
    const fallbackReport = await buildStaticReport(targetUrl, options, limitation);

    return finalizeReport({
      ...fallbackReport,
      generatedAt,
      targetUrl,
      outDir: options.outDir,
    });
  }
}

async function buildPlaywrightReport(targetUrl, options) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const issues = [];
  const viewports = [];
  let documentSnapshot;

  try {
    for (const viewport of options.viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => undefined);

      if (!documentSnapshot) {
        documentSnapshot = await page.evaluate(collectDocumentSnapshot);
        issues.push(...buildDocumentIssues(documentSnapshot));
        issues.push(...await buildLinkIssues(documentSnapshot, targetUrl));
      }

      const screenshotName = `screenshots/${safeFileName(viewport.name)}.png`;
      await page.screenshot({ path: join(options.outDir, screenshotName), fullPage: true });

      const viewportAudit = await page.evaluate(collectViewportAudit);
      const viewportIssues = buildViewportIssues(viewportAudit, viewport.name);
      issues.push(...viewportIssues);

      viewports.push({
        name: viewport.name,
        width: viewport.width,
        height: viewport.height,
        screenshot: screenshotName,
        screenshotStatus: "captured",
        checks: {
          overflow: {
            status: viewportAudit.overflow.hasOverflow ? "fail" : "pass",
            viewportWidth: viewportAudit.overflow.viewportWidth,
            scrollWidth: viewportAudit.overflow.scrollWidth,
            flaggedElements: viewportAudit.overflow.elements.length,
          },
          contrast: {
            status: viewportAudit.contrast.violations.length > 0 ? "warn" : "pass",
            checkedElements: viewportAudit.contrast.checkedElements,
            violations: viewportAudit.contrast.violations.length,
          },
        },
      });
    }
  } finally {
    await browser.close();
  }

  return {
    title: documentSnapshot?.title || "Responsive QA report",
    browser: { status: "available" },
    viewports,
    issues,
  };
}

async function buildStaticReport(targetUrl, options, limitation) {
  const html = await readTargetHtml(targetUrl);
  const documentSnapshot = collectStaticDocumentSnapshot(html, targetUrl);
  const issues = [
    {
      id: "browser-unavailable",
      check: "browser",
      severity: "info",
      viewport: "all",
      message: "Browser checks were skipped because Playwright could not launch.",
      help: limitation,
    },
    ...buildDocumentIssues(documentSnapshot),
    ...await buildLinkIssues(documentSnapshot, targetUrl),
  ];

  return {
    title: documentSnapshot.title || "Responsive QA report",
    browser: { status: "unavailable", limitation },
    viewports: options.viewports.map((viewport) => ({
      name: viewport.name,
      width: viewport.width,
      height: viewport.height,
      screenshot: null,
      screenshotStatus: "skipped",
      checks: {
        overflow: { status: "skipped", reason: "Requires a launched Playwright browser." },
        contrast: { status: "skipped", reason: "Requires computed browser styles." },
      },
    })),
    issues,
  };
}

function finalizeReport({ generatedAt, targetUrl, outDir, title, browser, viewports, issues }) {
  const normalizedIssues = issues
    .map((issue, index) => ({
      id: issue.id || `${issue.check}-${index + 1}`,
      ...issue,
    }))
    .sort((left, right) => severityRank[right.severity] - severityRank[left.severity]);

  const errorCount = normalizedIssues.filter((issue) => issue.severity === "error").length;
  const warningCount = normalizedIssues.filter((issue) => issue.severity === "warning").length;
  const infoCount = normalizedIssues.filter((issue) => issue.severity === "info").length;

  return {
    schemaVersion: "1.0.0",
    generatedAt,
    title,
    target: { url: targetUrl },
    summary: {
      status: errorCount > 0 ? "fail" : warningCount > 0 ? "review" : "pass",
      checkedViewports: viewports.length,
      totalIssues: normalizedIssues.length,
      errorCount,
      warningCount,
      infoCount,
    },
    metadata: {
      runner: "foxhen-responsive-qa-runner",
      outputDirectory: outDir,
      browser,
      checks: [
        "horizontal-overflow",
        "missing-alt",
        "heading-order",
        "broken-link",
        "contrast",
      ],
    },
    viewports,
    issues: normalizedIssues,
  };
}

function collectDocumentSnapshot() {
  function selectorFor(element) {
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }

    const parts = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      const tag = current.tagName.toLowerCase();
      const parent = current.parentElement;
      if (!parent) {
        parts.unshift(tag);
        break;
      }
      const sameTagSiblings = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
      const position = sameTagSiblings.indexOf(current) + 1;
      parts.unshift(sameTagSiblings.length > 1 ? `${tag}:nth-of-type(${position})` : tag);
      current = parent;
    }

    return parts.length ? parts.join(" > ") : "body";
  }

  const anchors = new Set();
  document.querySelectorAll("[id]").forEach((element) => anchors.add(element.id));
  document.querySelectorAll("a[name]").forEach((element) => anchors.add(element.getAttribute("name")));

  return {
    title: document.title,
    url: location.href,
    anchors: Array.from(anchors).filter(Boolean),
    images: Array.from(document.images).map((image) => ({
      selector: selectorFor(image),
      alt: image.getAttribute("alt"),
      src: image.currentSrc || image.src || image.getAttribute("src") || "",
    })),
    headings: Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((heading) => ({
      selector: selectorFor(heading),
      level: Number(heading.tagName.slice(1)),
      text: heading.textContent.trim().replace(/\s+/g, " "),
    })),
    links: Array.from(document.querySelectorAll("a[href]")).map((anchor) => ({
      selector: selectorFor(anchor),
      href: anchor.getAttribute("href") || "",
      resolvedHref: anchor.href,
      text: anchor.textContent.trim().replace(/\s+/g, " "),
    })),
  };
}

function collectViewportAudit() {
  function selectorFor(element) {
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }

    const parts = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      const tag = current.tagName.toLowerCase();
      const parent = current.parentElement;
      if (!parent) {
        parts.unshift(tag);
        break;
      }
      const sameTagSiblings = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
      const position = sameTagSiblings.indexOf(current) + 1;
      parts.unshift(sameTagSiblings.length > 1 ? `${tag}:nth-of-type(${position})` : tag);
      current = parent;
    }

    return parts.length ? parts.join(" > ") : "body";
  }

  function parseColor(value) {
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const [red, green, blue, alpha = "1"] = match[1].split(",").map((part) => Number(part.trim()));
    if ([red, green, blue].some((channel) => Number.isNaN(channel))) return null;
    return { red, green, blue, alpha: Number.isNaN(alpha) ? 1 : alpha };
  }

  function relativeLuminance(color) {
    const channels = [color.red, color.green, color.blue].map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }

  function contrastRatio(foreground, background) {
    const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
    const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
    return (light + 0.05) / (dark + 0.05);
  }

  function backgroundFor(element) {
    let current = element;
    while (current) {
      const background = parseColor(getComputedStyle(current).backgroundColor);
      if (background && background.alpha > 0) {
        return background;
      }
      current = current.parentElement;
    }
    return { red: 255, green: 255, blue: 255, alpha: 1 };
  }

  const viewportWidth = window.innerWidth;
  const scrollWidth = Math.max(
    document.documentElement.scrollWidth,
    document.body ? document.body.scrollWidth : 0,
  );
  const overflowElements = Array.from(document.body.querySelectorAll("*"))
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        selector: selectorFor(element),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      };
    })
    .filter((rect) => rect.right > viewportWidth + 1 || rect.left < -1)
    .slice(0, 8);

  const contrastViolations = [];
  let checkedElements = 0;
  for (const element of Array.from(document.body.querySelectorAll("*"))) {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const text = element.textContent.trim().replace(/\s+/g, " ");
    if (!text || style.visibility === "hidden" || style.display === "none" || rect.width === 0 || rect.height === 0) {
      continue;
    }

    const foreground = parseColor(style.color);
    const background = backgroundFor(element);
    if (!foreground || !background) {
      continue;
    }

    checkedElements += 1;
    const ratio = contrastRatio(foreground, background);
    const fontSize = Number.parseFloat(style.fontSize);
    const fontWeight = Number.parseInt(style.fontWeight, 10);
    const largeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
    const threshold = largeText ? 3 : 4.5;

    if (ratio < threshold) {
      contrastViolations.push({
        selector: selectorFor(element),
        text: text.slice(0, 96),
        ratio: Number(ratio.toFixed(2)),
        threshold,
      });
    }

    if (contrastViolations.length >= 12) {
      break;
    }
  }

  return {
    overflow: {
      hasOverflow: scrollWidth > viewportWidth + 1,
      viewportWidth,
      scrollWidth,
      elements: overflowElements,
    },
    contrast: {
      checkedElements,
      violations: contrastViolations,
    },
  };
}

function buildDocumentIssues(snapshot) {
  const issues = [];

  for (const image of snapshot.images) {
    if (image.alt === null || image.alt.trim() === "") {
      issues.push({
        id: `missing-alt-${safeId(image.selector || image.src)}`,
        check: "missing-alt",
        severity: "warning",
        viewport: "all",
        selector: image.selector,
        message: "Image is missing useful alt text.",
        help: "Add an alt attribute that describes meaningful images. Use alt=\"\" only for decorative images.",
      });
    }
  }

  if (snapshot.headings.length === 0) {
    issues.push({
      id: "heading-order-none",
      check: "heading-order",
      severity: "warning",
      viewport: "all",
      message: "No headings were found on the page.",
      help: "Use a clear h1 and nested h2-h6 headings to preserve document structure.",
    });
  }

  const h1Count = snapshot.headings.filter((heading) => heading.level === 1).length;
  if (h1Count === 0 && snapshot.headings.length > 0) {
    issues.push({
      id: "heading-order-missing-h1",
      check: "heading-order",
      severity: "warning",
      viewport: "all",
      message: "The page has headings but no h1.",
      help: "Add one primary h1 that names the page.",
    });
  }
  if (h1Count > 1) {
    issues.push({
      id: "heading-order-multiple-h1",
      check: "heading-order",
      severity: "info",
      viewport: "all",
      message: `The page has ${h1Count} h1 headings.`,
      help: "Multiple h1 elements can be valid, but most client QA reports should review whether this is intentional.",
    });
  }

  let previousHeading = null;
  for (const heading of snapshot.headings) {
    if (previousHeading && heading.level - previousHeading.level > 1) {
      issues.push({
        id: `heading-order-skip-${safeId(heading.selector)}`,
        check: "heading-order",
        severity: "warning",
        viewport: "all",
        selector: heading.selector,
        message: `Heading jumps from h${previousHeading.level} to h${heading.level}: "${heading.text}".`,
        help: "Avoid skipped heading levels so assistive technology users can scan the page structure.",
      });
    }
    previousHeading = heading;
  }

  return issues;
}

async function buildLinkIssues(snapshot, targetUrl) {
  const issues = [];
  const target = new URL(targetUrl);

  for (const link of snapshot.links) {
    if (!link.href || /^(mailto:|tel:|sms:|javascript:|data:)/i.test(link.href)) {
      continue;
    }

    if (link.href.startsWith("#")) {
      const anchorId = decodeURIComponent(link.href.slice(1));
      if (anchorId && !snapshot.anchors.includes(anchorId)) {
        issues.push(brokenLinkIssue(link, `Missing same-page anchor "#${anchorId}".`));
      }
      continue;
    }

    let resolved;
    try {
      resolved = new URL(link.resolvedHref || link.href, target);
    } catch {
      issues.push(brokenLinkIssue(link, `Invalid link URL "${link.href}".`));
      continue;
    }

    if (resolved.protocol === "file:") {
      const filePath = fileURLToPath(resolved);
      if (!existsSync(filePath)) {
        issues.push(brokenLinkIssue(link, `Local file target does not exist: ${filePath}.`));
      }
      continue;
    }

    if (resolved.protocol === "http:" || resolved.protocol === "https:") {
      const status = await fetchLinkStatus(resolved.href);
      if (status.kind === "broken") {
        issues.push(brokenLinkIssue(link, status.message));
      }
    }
  }

  return issues;
}

function brokenLinkIssue(link, message) {
  return {
    id: `broken-link-${safeId(link.selector || link.href)}`,
    check: "broken-link",
    severity: "warning",
    viewport: "all",
    selector: link.selector,
    message,
    help: "Update the link target, remove the link, or document why it is expected to be unavailable locally.",
  };
}

async function fetchLinkStatus(href) {
  for (const method of ["HEAD", "GET"]) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(href, {
        method,
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (response.status >= 400) {
        return { kind: "broken", message: `${href} returned HTTP ${response.status}.` };
      }
      return { kind: "ok" };
    } catch (error) {
      clearTimeout(timeout);
      if (method === "GET") {
        return {
          kind: "skipped",
          message: `Could not verify ${href}: ${error instanceof Error ? error.message : String(error)}.`,
        };
      }
    }
  }

  return { kind: "skipped", message: `Could not verify ${href}.` };
}

function buildViewportIssues(audit, viewportName) {
  const issues = [];

  if (audit.overflow.hasOverflow) {
    issues.push({
      id: `horizontal-overflow-${safeId(viewportName)}`,
      check: "horizontal-overflow",
      severity: "error",
      viewport: viewportName,
      message: `Document scroll width is ${audit.overflow.scrollWidth}px in a ${audit.overflow.viewportWidth}px viewport.`,
      help: "Inspect wide fixed-width elements, 100vw sections with padding, carousels, tables, and off-canvas content.",
      evidence: audit.overflow.elements,
    });
  }

  for (const violation of audit.contrast.violations) {
    issues.push({
      id: `contrast-${safeId(viewportName)}-${safeId(violation.selector)}`,
      check: "contrast",
      severity: "warning",
      viewport: viewportName,
      selector: violation.selector,
      message: `Text contrast ratio ${violation.ratio}:1 is below ${violation.threshold}:1.`,
      help: `Review foreground/background colors for "${violation.text}".`,
    });
  }

  return issues;
}

async function readTargetHtml(targetUrl) {
  const target = new URL(targetUrl);

  if (target.protocol === "file:") {
    return readFile(fileURLToPath(target), "utf8");
  }

  if (target.protocol === "http:" || target.protocol === "https:") {
    const response = await fetch(target.href);
    if (!response.ok) {
      throw new Error(`Could not fetch ${target.href}: HTTP ${response.status}`);
    }
    return response.text();
  }

  throw new Error(`Unsupported target protocol for fallback scan: ${target.protocol}`);
}

function collectStaticDocumentSnapshot(html, targetUrl) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "Responsive QA report";
  const anchors = [];
  const images = [];
  const headings = [];
  const links = [];

  for (const match of html.matchAll(/<([a-z][a-z0-9-]*)([^>]*)>/gi)) {
    const tag = match[1].toLowerCase();
    const attributes = parseAttributes(match[2] || "");
    if (attributes.id) anchors.push(attributes.id);
    if (tag === "a" && attributes.name) anchors.push(attributes.name);
    if (tag === "img") {
      images.push({
        selector: `img[src="${attributes.src ?? ""}"]`,
        src: attributes.src ?? "",
        alt: Object.hasOwn(attributes, "alt") ? attributes.alt : null,
      });
    }
    if (tag === "a" && attributes.href) {
      links.push({
        selector: `a[href="${attributes.href}"]`,
        href: attributes.href,
        resolvedHref: new URL(attributes.href, targetUrl).href,
        text: attributes.href,
      });
    }
  }

  for (const match of html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const level = Number(match[1]);
    const text = stripTags(match[2]).replace(/\s+/g, " ").trim();
    headings.push({
      selector: `h${level}:contains("${text.slice(0, 32)}")`,
      level,
      text,
    });
  }

  return {
    title: stripTags(title),
    url: targetUrl,
    anchors,
    images,
    headings,
    links,
  };
}

function parseAttributes(source) {
  const attributes = {};
  for (const match of source.matchAll(/([:\w-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    attributes[match[1].toLowerCase()] = match[3] ?? match[4] ?? match[5] ?? "";
  }
  return attributes;
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
}

function buildHtmlReport(report) {
  const issueRows = report.issues.map((issue) => `
    <tr>
      <td><span class="severity ${issue.severity}">${escapeHtml(issue.severity)}</span></td>
      <td>${escapeHtml(issue.check)}</td>
      <td>${escapeHtml(issue.viewport)}</td>
      <td>
        <strong>${escapeHtml(issue.message)}</strong>
        ${issue.selector ? `<small>${escapeHtml(issue.selector)}</small>` : ""}
        <p>${escapeHtml(issue.help || "")}</p>
      </td>
    </tr>
  `).join("");

  const viewportCards = report.viewports.map((viewport) => `
    <article class="viewport-card">
      <div>
        <h3>${escapeHtml(viewport.name)}</h3>
        <p>${viewport.width} × ${viewport.height}</p>
      </div>
      ${viewport.screenshot ? `<img src="${escapeHtml(viewport.screenshot)}" alt="${escapeHtml(viewport.name)} screenshot" />` : `<div class="screenshot-empty">Screenshot ${escapeHtml(viewport.screenshotStatus)}</div>`}
      <dl>
        <div><dt>Overflow</dt><dd>${escapeHtml(viewport.checks.overflow.status)}</dd></div>
        <div><dt>Contrast</dt><dd>${escapeHtml(viewport.checks.contrast.status)}</dd></div>
      </dl>
    </article>
  `).join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Responsive QA report</title>
    <style>
      :root { color: #08141f; background: #f6f3eb; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; }
      main { width: min(1180px, 92vw); margin: 0 auto; padding: 48px 0; }
      header { display: grid; gap: 16px; margin-bottom: 28px; }
      h1 { margin: 0; font-size: clamp(2.6rem, 7vw, 5.8rem); line-height: .9; letter-spacing: -.08em; }
      h2 { margin: 0 0 16px; font-size: clamp(1.8rem, 4vw, 3rem); letter-spacing: -.05em; }
      h3, p { margin-top: 0; }
      a { color: inherit; }
      .meta { color: #5f6b7b; font-weight: 700; }
      .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }
      .summary article, .viewport-card, .limitation, table { border: 1px solid rgba(8,20,31,.12); border-radius: 24px; background: rgba(255,255,255,.82); box-shadow: 0 16px 45px rgba(8,20,31,.08); }
      .summary article { padding: 18px; }
      .summary span { display: block; color: #687484; font-size: .78rem; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
      .summary strong { display: block; margin-top: 8px; font-size: 2rem; letter-spacing: -.05em; }
      .status { display: inline-flex; width: fit-content; border-radius: 999px; padding: 8px 12px; background: #08141f; color: white; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
      .status.fail { background: #8f2424; }
      .status.review { background: #946315; }
      .status.pass { background: #1f6b48; }
      .limitation { margin: 18px 0; padding: 18px; background: #fff7df; }
      .viewport-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 32px; }
      .viewport-card { overflow: hidden; }
      .viewport-card > div:first-child { padding: 18px 18px 0; }
      .viewport-card h3 { margin-bottom: 4px; font-size: 1.5rem; }
      .viewport-card img, .screenshot-empty { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; margin-top: 12px; border-top: 1px solid rgba(8,20,31,.1); border-bottom: 1px solid rgba(8,20,31,.1); }
      .screenshot-empty { display: grid; place-items: center; color: #687484; background: #eef1f4; font-weight: 900; }
      dl { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0; padding: 14px; }
      dt { color: #687484; font-size: .74rem; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
      dd { margin: 4px 0 0; font-weight: 900; }
      table { width: 100%; border-collapse: collapse; overflow: hidden; }
      th, td { padding: 14px; border-bottom: 1px solid rgba(8,20,31,.1); text-align: left; vertical-align: top; }
      th { color: #687484; font-size: .75rem; letter-spacing: .12em; text-transform: uppercase; }
      td small, td p { display: block; margin: 6px 0 0; color: #687484; }
      .severity { display: inline-flex; border-radius: 999px; padding: 5px 9px; color: white; font-size: .72rem; font-weight: 900; text-transform: uppercase; }
      .severity.error { background: #8f2424; }
      .severity.warning { background: #946315; }
      .severity.info { background: #31536f; }
      @media (max-width: 820px) { .summary, .viewport-grid { grid-template-columns: 1fr; } table { display: block; overflow-x: auto; } }
    </style>
  </head>
  <body>
    <main>
      <header>
        <span class="status ${escapeHtml(report.summary.status)}">${escapeHtml(report.summary.status)}</span>
        <h1>Responsive QA report</h1>
        <p class="meta">${escapeHtml(report.target.url)} · ${escapeHtml(report.generatedAt)}</p>
      </header>
      ${report.metadata.browser.status === "unavailable" ? `<section class="limitation"><strong>Browser limitation:</strong> ${escapeHtml(report.metadata.browser.limitation)}</section>` : ""}
      <section class="summary" aria-label="Report summary">
        <article><span>Viewports</span><strong>${report.summary.checkedViewports}</strong></article>
        <article><span>Issues</span><strong>${report.summary.totalIssues}</strong></article>
        <article><span>Errors</span><strong>${report.summary.errorCount}</strong></article>
        <article><span>Warnings</span><strong>${report.summary.warningCount}</strong></article>
      </section>
      <section>
        <h2>Viewport evidence</h2>
        <div class="viewport-grid">${viewportCards}</div>
      </section>
      <section>
        <h2>Findings</h2>
        <table>
          <thead><tr><th>Severity</th><th>Check</th><th>Viewport</th><th>Finding</th></tr></thead>
          <tbody>${issueRows || `<tr><td colspan="4">No issues found.</td></tr>`}</tbody>
        </table>
      </section>
    </main>
  </body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeId(value) {
  return safeFileName(value).slice(0, 72) || "item";
}

function safeFileName(value) {
  const extension = extname(value);
  const base = extension ? value.slice(0, -extension.length) : value;
  return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

main();
