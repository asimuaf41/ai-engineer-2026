// Lighthouse 13 against a running production build (never `next dev`: dev is slow on purpose).
// Usage: node scripts/lighthouse.mjs [baseUrl] [--desktop]
// Default is mobile (slow 4G, 4x slower CPU), the same setup PageSpeed Insights uses.
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

// One row per page. Marketing pages must hit 90+. App pages (behind login later) are noindex,
// so SEO is skipped there, and their perf budget is honest about the charts they load.
const PAGES = [
  { path: "/", performance: 90, seo: 95 },
  { path: "/demo", performance: 90, seo: 95 },
  { path: "/ask", performance: 85, seo: 95 },
  { path: "/dashboard", performance: 80, seo: null },
];
const ALWAYS = { accessibility: 95, "best-practices": 95 };
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const RUNS = 3; // one run is noise; we keep the median

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith("--")) ?? "http://localhost:3000").replace(/\/$/, "");
const desktop = args.includes("--desktop");
const only = process.env.LH_PAGES?.split(","); // e.g. LH_PAGES=/,/demo
const pages = only ? PAGES.filter((p) => only.includes(p.path)) : PAGES;

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const score = (lhr, c) => Math.round((lhr.categories[c]?.score ?? 0) * 100);

const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH ?? chromium.executablePath(),
  chromeFlags: ["--headless=new"],
});

const rows = [];
const misses = [];
try {
  await mkdir("reports/lighthouse", { recursive: true });
  for (const page of pages) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const result = await lighthouse(
        `${base}${page.path}`,
        { port: chrome.port, output: "html", onlyCategories: CATEGORIES, logLevel: "error" },
        desktop ? desktopConfig : undefined,
      );
      if (!result) throw new Error(`Lighthouse returned nothing for ${page.path}`);
      if (result.lhr.runtimeError) throw new Error(`${page.path}: ${result.lhr.runtimeError.message}`);
      runs.push(result);
    }
    const perf = runs.map((r) => score(r.lhr, "performance"));
    const mid = runs[perf.indexOf(median(perf))];
    const name = page.path === "/" ? "home" : page.path.slice(1).replaceAll("/", "-");
    await writeFile(`reports/lighthouse/${name}${desktop ? "-desktop" : ""}.html`, mid.report);

    const a = mid.lhr.audits;
    const row = { page: page.path };
    for (const c of CATEGORIES) {
      const budget = c in ALWAYS ? ALWAYS[c] : page[c];
      row[c] = budget === null ? `${score(mid.lhr, c)} (skip)` : score(mid.lhr, c);
      if (budget !== null && score(mid.lhr, c) < budget) misses.push(`${page.path} ${c} ${score(mid.lhr, c)} < ${budget}`);
    }
    Object.assign(row, {
      LCP: a["largest-contentful-paint"].displayValue,
      CLS: a["cumulative-layout-shift"].displayValue,
      TBT: a["total-blocking-time"].displayValue,
    });
    rows.push(row);
  }
} finally {
  await chrome.kill();
}

console.log(`\nLighthouse 13 · ${desktop ? "desktop" : "mobile"} · median of ${RUNS} runs · ${base}`);
console.table(rows);
console.log("HTML reports: reports/lighthouse/");
if (misses.length) {
  console.error(`❌ Below budget:\n  ${misses.join("\n  ")}\nOpen that page's report and read "Insights" first.`);
  process.exit(1);
}
console.log("✅ Every page is within budget.");
