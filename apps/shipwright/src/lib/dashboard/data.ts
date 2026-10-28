// Dashboard data. Demo data for now: Day 13 replaces the function bodies with Supabase queries,
// and the signatures stay the same so the pages don't change.
import "server-only";
import { connection } from "next/server";
import type { Issue, Severity } from "@/components/issue-card";
import { productionScore, SAMPLE_ISSUES } from "@/lib/sample-issues";
import {
  type Activity,
  CATEGORIES,
  CATEGORY_LABEL,
  type Category,
  type CategoryCount,
  type DashboardIssue,
  type Kpi,
  type ScorePoint,
} from "./types";

// Demo data only: remove with the real data.
export type Simulate = "error" | "empty" | "slow" | "widget-error";
const SIMULATE_VALUES: readonly string[] = ["error", "empty", "slow", "widget-error"];

export function parseSimulate(value: string | string[] | undefined): Simulate | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first !== undefined && SIMULATE_VALUES.includes(first) ? (first as Simulate) : undefined;
}

// Seeded random (mulberry32): Math.random() would give different data on every request, so the
// table, the KPIs and the category chart would disagree with each other and with the last render.
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Template = { slug: string; title: string; file: string; severity: Severity; category: Category };

const SAMPLE_CATEGORY: Record<string, Category> = {
  "svc-key": "security",
  "orders-rls": "database",
  "stripe-webhook": "payments",
  "ai-keystroke": "ai-cost",
  "chat-rate-limit": "ai-cost",
  "hero-image": "performance",
};

const REPOS = ["acme/checkout-app", "acme/marketing-site", "acme/admin-panel"] as const;

const TEMPLATES: Template[] = [
  { slug: "jwt-secret", title: "JWT secret is hardcoded", file: "src/lib/auth.ts", severity: "critical", category: "security" },
  { slug: "sql-concat", title: "SQL query built from user input", file: "src/app/api/search/route.ts", severity: "critical", category: "database" },
  { slug: "cors-open", title: "CORS allows every origin", file: "src/middleware.ts", severity: "high", category: "security" },
  { slug: "no-index", title: "Slow query on a table with no index", file: "supabase/migrations/011_events.sql", severity: "high", category: "database" },
  { slug: "refund-check", title: "Refund endpoint skips the owner check", file: "src/app/api/refund/route.ts", severity: "high", category: "payments" },
  { slug: "prompt-size", title: "Whole chat history sent on every call", file: "src/app/api/chat/route.ts", severity: "medium", category: "ai-cost" },
  { slug: "n-plus-one", title: "N+1 queries on the orders page", file: "src/app/orders/page.tsx", severity: "medium", category: "database" },
  { slug: "price-client", title: "Price is read from the browser", file: "src/app/checkout/actions.ts", severity: "medium", category: "payments" },
  { slug: "bundle-size", title: "Charts library loads on every page", file: "src/app/layout.tsx", severity: "medium", category: "performance" },
  { slug: "no-cache", title: "AI answers are never cached", file: "src/lib/ai.ts", severity: "low", category: "ai-cost" },
  { slug: "font-block", title: "Web font blocks the first paint", file: "src/app/layout.tsx", severity: "low", category: "performance" },
  { slug: "debug-log", title: "Debug logs print user emails", file: "src/lib/log.ts", severity: "low", category: "security" },
];

// What an issue looks like before we know today's date: foundAt is worked out per request from
// daysAgo, so the data stays the same within a day but never goes stale in a long-running server.
type Seed = Omit<DashboardIssue, "foundAt"> & { daysAgo: number; hour: number };

const rand = mulberry32(2026);

const SEEDS: Seed[] = [
  ...SAMPLE_ISSUES.map((issue): Seed => ({
    id: issue.id,
    severity: issue.severity,
    title: issue.title,
    file: issue.file,
    status: issue.status,
    repo: "acme/checkout-app",
    category: SAMPLE_CATEGORY[issue.id] ?? "security",
    daysAgo: Math.floor(rand() * 30),
    hour: Math.floor(rand() * 24),
  })),
  ...TEMPLATES.flatMap((template, index): Seed[] => {
    const repo = REPOS[index % REPOS.length] ?? REPOS[0];
    // Always draw the same four numbers per template, so skipping one doesn't shift the others.
    const skip = rand() < 0.25;
    const fixed = rand() < 0.38;
    const daysAgo = Math.floor(rand() * 30);
    const hour = Math.floor(rand() * 24);
    if (skip) return [];
    return [
      {
        id: `${template.slug}-${repo.split("/")[1]}`,
        severity: template.severity,
        title: template.title,
        file: template.file,
        status: fixed ? "fixed" : "open",
        repo,
        category: template.category,
        daysAgo,
        hour,
      },
    ];
  }),
];

function todayUtc(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function buildIssues(): DashboardIssue[] {
  const today = todayUtc();
  return SEEDS.map(({ daysAgo, hour, ...issue }) => ({
    ...issue,
    foundAt: new Date(today - daysAgo * 86_400_000 + hour * 3_600_000).toISOString(),
  }));
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// productionScore wants full Issues; the score only looks at severity and status.
function scoreOf(issues: DashboardIssue[]): number {
  return productionScore(issues.map((issue): Issue => ({ ...issue, summary: "" })));
}

export async function getIssues(simulate?: Simulate): Promise<DashboardIssue[]> {
  // Opt in to per-request rendering, so the loading skeletons really show.
  await connection();
  await wait(simulate === "slow" ? 3000 : 450);
  if (simulate === "error") throw new Error("Supabase timeout: issues query took longer than 10 s");
  if (simulate === "empty") return [];
  return buildIssues();
}

export async function getKpis(): Promise<Kpi[]> {
  await connection();
  await wait(250);
  const issues = buildIssues();
  const score = scoreOf(issues);
  const open = issues.filter((issue) => issue.status === "open").length;
  const fixed = issues.length - open;

  return [
    {
      id: "score",
      label: "Production score",
      value: score,
      suffix: "/100",
      delta: `up ${Math.max(score - 18, 0)} points this month`,
      trend: "good",
      history: [18, 18, 18, 24, 31, 38, score],
    },
    {
      id: "open",
      label: "Open issues",
      value: open,
      delta: "3 fewer than last week",
      trend: "good",
      history: [open + 5, open + 5, open + 4, open + 4, open + 3, open + 3, open],
    },
    {
      id: "fixed",
      label: "Fixed this month",
      value: fixed,
      delta: "4 more than last week",
      trend: "good",
      history: [Math.max(fixed - 6, 0), Math.max(fixed - 5, 0), Math.max(fixed - 4, 0), Math.max(fixed - 3, 0), Math.max(fixed - 2, 0), Math.max(fixed - 1, 0), fixed],
    },
    {
      id: "ai-spend",
      label: "AI spend",
      value: 126,
      prefix: "$",
      delta: "$18 more than last week",
      trend: "bad",
      history: [84, 91, 97, 104, 110, 118, 126],
    },
  ];
}

export async function getScoreHistory(simulate?: Simulate): Promise<ScorePoint[]> {
  await connection();
  await wait(900);
  if (simulate === "widget-error") throw new Error("Metrics service unavailable");
  const today = todayUtc();
  // Day 0 is 29 days ago. Flat at 18 until day 12, then climbing to 43 today.
  return Array.from({ length: 30 }, (_, day) => ({
    date: new Date(today - (29 - day) * 86_400_000).toISOString().slice(0, 10),
    score: day <= 12 ? 18 : 18 + Math.round(((day - 12) * 25) / 17),
  }));
}

export async function getOpenByCategory(): Promise<CategoryCount[]> {
  await connection();
  await wait(600);
  const open = buildIssues().filter((issue) => issue.status === "open");
  return CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    open: open.filter((issue) => issue.category === category).length,
  })).sort((a, b) => b.open - a.open);
}

export async function getActivity(): Promise<Activity[]> {
  await connection();
  await wait(500);
  const latest = buildIssues()
    .sort((a, b) => b.foundAt.localeCompare(a.foundAt))
    .slice(0, 4)
    .map((issue): Activity => ({
      id: issue.id,
      when: issue.foundAt,
      text: issue.status === "fixed" ? `Fixed: ${issue.title}` : `Found: ${issue.title}`,
      kind: issue.status === "fixed" ? "fixed" : "found",
    }));
  const scan: Activity = {
    id: "scan-latest",
    when: new Date(todayUtc() + 6 * 3_600_000).toISOString(),
    text: "Scanned acme/checkout-app",
    kind: "scan",
  };
  return [scan, ...latest].sort((a, b) => b.when.localeCompare(a.when));
}

export type CommandIssue = Pick<DashboardIssue, "id" | "title" | "severity" | "repo">;

// Open issues only, for the command palette.
export async function getCommandIssues(): Promise<CommandIssue[]> {
  await connection();
  return buildIssues()
    .filter((issue) => issue.status === "open")
    .map(({ id, title, severity, repo }) => ({ id, title, severity, repo }));
}
