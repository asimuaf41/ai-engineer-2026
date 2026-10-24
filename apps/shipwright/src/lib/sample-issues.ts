import type { Issue, Severity } from "@/components/issue-card";

// Seeded sample data for the demo report and the design page. Replaced by real scan results on Day 13.
export const SAMPLE_ISSUES: Issue[] = [
  {
    id: "svc-key",
    severity: "critical",
    title: "Service-role key in the browser bundle",
    summary: "A NEXT_PUBLIC_ variable holds a key that can read and write every row. Anyone can copy it from the page source.",
    file: "src/lib/supabase.ts",
    status: "open",
  },
  {
    id: "orders-rls",
    severity: "high",
    title: "“orders” table has no row-level security",
    summary: "Any signed-in user can read every customer's orders by changing the id in the request.",
    file: "supabase/migrations/004_orders.sql",
    status: "open",
  },
  {
    id: "stripe-webhook",
    severity: "high",
    title: "Stripe webhook signature is not checked",
    summary: "Anyone who finds the webhook URL can send a fake “payment succeeded” message and get a paid plan for free.",
    file: "src/app/api/stripe/webhook/route.ts",
    status: "open",
  },
  {
    id: "ai-keystroke",
    severity: "medium",
    title: "Claude is called on every keystroke",
    summary: "The input calls the API on each change, which burns tokens and slows the page. Debounce it or call on submit.",
    file: "src/app/editor/assistant.tsx",
    status: "fixed",
  },
  {
    id: "chat-rate-limit",
    severity: "medium",
    title: "No rate limit on /api/chat",
    summary: "One person or bot can send thousands of requests and run up your AI bill overnight.",
    file: "src/app/api/chat/route.ts",
    status: "open",
  },
  {
    id: "hero-image",
    severity: "low",
    title: "Hero image is 4.8 MB",
    summary: "The first screen loads slowly on phones. Resize and compress the image to cut the wait.",
    file: "public/hero.png",
    status: "open",
  },
];

// Points taken off the score for each problem that is still open.
const PENALTY: Record<Severity, number> = { critical: 25, high: 12, medium: 6, low: 2 };

// 100 minus a penalty per OPEN issue, never below 0. Fixed issues cost nothing.
export function productionScore(issues: Issue[]): number {
  const penalty = issues.reduce((total, issue) => total + (issue.status === "open" ? PENALTY[issue.severity] : 0), 0);
  return Math.max(0, 100 - penalty);
}
