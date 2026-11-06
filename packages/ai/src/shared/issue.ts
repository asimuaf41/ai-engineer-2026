export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const ISSUE_STATUSES = ["open", "fixed"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const CATEGORIES = ["security", "database", "payments", "performance", "ai-cost"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Issue = {
  id: string;
  severity: Severity;
  title: string;
  summary: string;
  // Plain-English steps to fix it.
  fix: string;
  category: Category;
  file: string;
  status: IssueStatus;
};
