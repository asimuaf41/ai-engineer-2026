// Demo history for the phone's report, scan history and activity screens. Fixed numbers (no dates, no
// randomness), so every device shows the same story. "Ago" values are relative to today.
// Replaced by real scan results when the scans are real.

// Weekly production score for acme/checkout-app, oldest first. The phone adds today's live score at the end.
export type ScorePoint = { weeksAgo: number; score: number };
export const SCORE_TREND: ScorePoint[] = [
  { weeksAgo: 7, score: 34 },
  { weeksAgo: 6, score: 41 },
  { weeksAgo: 5, score: 39 },
  { weeksAgo: 4, score: 52 },
  { weeksAgo: 3, score: 58 },
  { weeksAgo: 2, score: 55 },
  { weeksAgo: 1, score: 63 },
];

export const SCAN_TRIGGERS = ["Manual scan", "Pull request", "Scheduled scan"] as const;
export type ScanTrigger = (typeof SCAN_TRIGGERS)[number];
export type Scan = { id: string; daysAgo: number; trigger: ScanTrigger; score: number; found: number; fixed: number };

// Newest first.
export const SCAN_HISTORY: Scan[] = [
  { id: "scan-6", daysAgo: 0, trigger: "Manual scan", score: 65, found: 6, fixed: 1 },
  { id: "scan-5", daysAgo: 3, trigger: "Pull request", score: 63, found: 7, fixed: 0 },
  { id: "scan-4", daysAgo: 7, trigger: "Scheduled scan", score: 55, found: 8, fixed: 2 },
  { id: "scan-3", daysAgo: 14, trigger: "Scheduled scan", score: 52, found: 9, fixed: 1 },
  { id: "scan-2", daysAgo: 21, trigger: "Pull request", score: 41, found: 11, fixed: 0 },
  { id: "scan-1", daysAgo: 28, trigger: "Manual scan", score: 34, found: 12, fixed: 0 },
];

export const ACTIVITY_KINDS = ["scan", "fixed", "pr", "escalated", "alert"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];
export type ActivityItem = { id: string; hoursAgo: number; kind: ActivityKind; text: string };

// Newest first.
export const ACTIVITY: ActivityItem[] = [
  { id: "a1", hoursAgo: 2, kind: "scan", text: "Scan finished: 6 issues found in acme/checkout-app" },
  { id: "a2", hoursAgo: 5, kind: "fixed", text: "“Hero image is 4 MB” marked as fixed" },
  { id: "a3", hoursAgo: 26, kind: "pr", text: "Pull request #41 opened for the Stripe webhook check" },
  { id: "a4", hoursAgo: 30, kind: "escalated", text: "A senior engineer is reviewing the leaked service key" },
  { id: "a5", hoursAgo: 52, kind: "alert", text: "New critical issue: service-role key in the browser bundle" },
  { id: "a6", hoursAgo: 75, kind: "scan", text: "Scan finished: score went from 55 to 63" },
  { id: "a7", hoursAgo: 120, kind: "pr", text: "Pull request #38 merged: add a rate limit to the chat route" },
  { id: "a8", hoursAgo: 168, kind: "fixed", text: "“Chat has no rate limit” marked as fixed" },
];
