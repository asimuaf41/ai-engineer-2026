import type { Category, Severity } from "@repo/ai/shared";
import type { TriageStatus } from "@/lib/triage-types";

// Same words as the web dashboard. Copied here because the web labels live inside apps/shipwright.
export const CATEGORY_LABEL: Record<Category, string> = {
  security: "Security",
  database: "Database",
  payments: "Payments",
  performance: "Performance",
  "ai-cost": "AI cost",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

// "1 open issue", "3 open issues".
export function openIssuesText(count: number): string {
  return `${count} open ${count === 1 ? "issue" : "issues"}`;
}

export const STATUS_LABEL: Record<TriageStatus, string> = {
  open: "Open",
  fixed: "Fixed",
  snoozed: "Snoozed",
  dismissed: "Dismissed",
  escalated: "Escalated",
};
