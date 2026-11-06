import type { Category, Severity } from "@repo/ai/shared";

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
