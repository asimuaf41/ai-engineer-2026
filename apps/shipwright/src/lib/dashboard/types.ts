// Shared dashboard types. No "server-only" here: client components (table, charts) import these too.
import type { Issue, Severity } from "@/components/issue-card";

export const SEVERITIES = ["critical", "high", "medium", "low"] as const satisfies readonly Severity[];

// Sort by risk, not alphabet: a plain A-Z sort would put "critical" before "high" only by luck.
export const SEVERITY_RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export const CATEGORIES = ["security", "database", "payments", "performance", "ai-cost"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  security: "Security",
  database: "Database",
  payments: "Payments",
  performance: "Performance",
  "ai-cost": "AI cost",
};

export type DashboardIssue = Omit<Issue, "summary"> & {
  repo: string;
  category: Category;
  // ISO string: this crosses server -> client, so no Date objects.
  foundAt: string;
};

export type Kpi = {
  id: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delta: string;
  trend: "good" | "bad";
  history: number[];
};

export type ScorePoint = { date: string; score: number };

export type CategoryCount = { category: Category; label: string; open: number };

export type Activity = {
  id: string;
  when: string;
  text: string;
  kind: "fixed" | "found" | "scan";
};
