// Times the whole new-founder flow while YOU click through it:
//   sign in -> create workspace -> GitHub -> pick repo -> Supabase -> pick project -> Ready
// Run: pnpm flow:time            (against http://localhost:3000, so start `pnpm dev` first)
//      pnpm flow:time https://your-site.example
// A browser window opens on the login page. Do the flow as a brand-new person (a new email address). The script watches the
// page, stamps each milestone, and prints a table with the total, so "is it under 3 minutes?" is a measured answer.
// It only LOOKS at the page address and the visible step. It never reads cookies, tokens or form fields.
import { chromium } from "../apps/shipwright/node_modules/@playwright/test/index.mjs";

const site = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const BUDGET_SECONDS = 180;

const MILESTONES = [
  { key: "signedIn", label: "Signed in" },
  { key: "workspace", label: "Workspace created" },
  { key: "github", label: "GitHub installed" },
  { key: "repo", label: "Repository chosen" },
  { key: "supabase", label: "Supabase connected (optional)" },
  { key: "project", label: "Supabase project chosen (optional)" },
  { key: "ready", label: "Ready for your first scan" },
];
const stamps = new Map();
const started = Date.now();
const seconds = (ms) => `${(ms / 1000).toFixed(1)}s`;
const mark = (key) => {
  if (stamps.has(key)) return;
  stamps.set(key, Date.now() - started);
  const label = MILESTONES.find((m) => m.key === key)?.label ?? key;
  console.log(`  ${seconds(stamps.get(key)).padStart(7)}  ${label}`);
};

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1200, height: 850 } });
const page = await context.newPage();
console.log(`Opening ${site}/login. Do the whole flow as a brand-new person. The clock started now.\n`);
await page.goto(`${site}/login`);

let finished = false;
let sawOnboarding = false;
const poll = setInterval(async () => {
  try {
    const url = new URL(page.url());
    if (url.origin !== site) return; // on GitHub or Supabase: the clock keeps running
    const path = url.pathname;
    if (path === "/onboarding") {
      sawOnboarding = true;
      mark("signedIn");
    }
    if (/^\/o\/[^/]+\/connect$/.test(path)) {
      mark("signedIn");
      if (sawOnboarding) mark("workspace");
      if (url.searchParams.get("step") === "repo") mark("github");
      if (url.searchParams.get("step") === "project") mark("supabase");

      const view = await page.evaluate(() => {
        const current = document.querySelector("ol[aria-label='Setup steps'] > li[aria-current='step'] h2")?.textContent ?? "";
        const summary = document.querySelector("dl")?.textContent ?? "";
        return { current, summary };
      });
      if (view.current === "Connect Supabase") {
        mark("github");
        mark("repo");
      }
      if (view.current.startsWith("Ready for your first scan")) {
        mark("github");
        mark("repo");
        if (!view.summary.includes("Not connected")) {
          mark("supabase");
          mark("project");
        }
        mark("ready");
        finished = true;
      }
    }
  } catch {
    // The page is changing: look again on the next tick.
  }
}, 500);

await new Promise((resolve) => {
  const wait = setInterval(() => {
    if (finished || page.isClosed()) {
      clearInterval(wait);
      resolve();
    }
  }, 500);
});
clearInterval(poll);

const total = stamps.get("ready");
console.log("\nMilestone                              at       step took");
let previous = 0;
for (const { key, label } of MILESTONES) {
  const at = stamps.get(key);
  if (at === undefined) {
    console.log(`${label.padEnd(38)} (skipped)`);
    continue;
  }
  console.log(`${label.padEnd(38)} ${seconds(at).padStart(7)}  ${seconds(at - previous).padStart(8)}`);
  previous = at;
}
if (total !== undefined) {
  console.log(`\nTotal: ${seconds(total)}. ${total / 1000 <= BUDGET_SECONDS ? "UNDER" : "OVER"} the ${BUDGET_SECONDS / 60}-minute goal.`);
  console.log("Tip: the slowest step is where to look first. Repeat with a second new person to see how consistent it is.");
} else {
  console.log("\nThe window was closed before the flow finished, so there is no total.");
}
await browser.close().catch(() => {});
