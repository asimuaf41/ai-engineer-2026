import type { Issue, Severity } from "./issue";

// Points taken off the score for each problem that is still open.
const PENALTY: Record<Severity, number> = { critical: 20, high: 12, medium: 6, low: 2 };

// 100 minus a penalty per OPEN issue, never below 0. Fixed issues cost nothing.
export function productionScore(issues: Pick<Issue, "severity" | "status">[]): number {
  const penalty = issues.reduce((total, issue) => total + (issue.status === "open" ? PENALTY[issue.severity] : 0), 0);
  return Math.max(0, 100 - penalty);
}
