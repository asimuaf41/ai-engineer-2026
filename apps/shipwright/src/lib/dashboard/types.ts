// Shared dashboard types. No "server-only" here: client components (table, charts) import these too.
import { CATEGORIES, type Category, type Issue, SEVERITIES, type Severity } from "@repo/ai/shared";

// These now live in @repo/ai/shared (the mobile app uses them too). Re-exported so imports here don't change.
export { CATEGORIES, SEVERITIES };
export type { Category };

// Sort by risk, not alphabet: a plain A-Z sort would put "critical" before "high" only by luck.
export const SEVERITY_RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export const CATEGORY_LABEL: Record<Category, string> = {
  security: "Security",
  database: "Database",
  payments: "Payments",
  performance: "Performance",
  "ai-cost": "AI cost",
};

export type DashboardIssue = Omit<Issue, "summary" | "fix" | "category"> & {
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
