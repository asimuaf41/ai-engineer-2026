// The tools the "Ask" chat can call. They run on the server in both demo and live mode,
// and return demo data until Day 12/14 connects real scans.
// repo-rules: allow-secret-samples  (the fake repo below contains a leaked key on purpose)
import "server-only";
import type { InferUITools, UIMessage } from "ai";
import { tool } from "ai";
import { z } from "zod";
import { SAMPLE_ISSUES } from "@/lib/sample-issues";

// Throw this for messages users may read. Everything else is masked by onError in the chat route.
export class ToolUserError extends Error {}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const DEMO_REPO: Record<string, string[]> = {
  "src/lib/supabase.ts": [
    'import { createClient } from "@supabase/supabase-js";',
    "",
    "export const supabase = createClient(",
    "  process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY!,",
    ");",
  ],
  "src/app/admin/page.tsx": [
    'import { supabase } from "@/lib/supabase";',
    "",
    "export default async function AdminPage() {",
    '  const { data: orders } = await supabase.from("orders").select("*");',
    "  return <OrdersTable orders={orders ?? []} />;",
    "}",
  ],
  "src/app/api/stripe/route.ts": [
    "export async function POST(req: Request) {",
    "  const event = await req.json(); // no signature check",
    '  if (event.type === "checkout.session.completed") await grantPlan(event.data.object);',
    "  return Response.json({ received: true });",
    "}",
  ],
};

const PROOFS: Record<string, { request: string; response: string; verdict: string }> = {
  "svc-key": {
    request: "curl https://acme.supabase.co/rest/v1/orders?select=* -H 'apikey: <key copied from the JS bundle>'",
    response: "200 OK · 1,204 rows · emails, addresses",
    verdict: "Confirmed: anyone with the page source can read every order.",
  },
  "orders-rls": {
    request: "curl https://acme.supabase.co/rest/v1/orders?id=eq.1 -H 'Authorization: Bearer <another customer's token>'",
    response: "200 OK · 1 row · another customer's order",
    verdict: "Confirmed: a signed-in user can read other customers' orders.",
  },
};

const listIssues = tool({
  description: "List the issues found in the scan, optionally filtered by status.",
  inputSchema: z.object({ status: z.enum(["open", "fixed", "all"]).default("open") }),
  execute: async ({ status }) => {
    await wait(700);
    return SAMPLE_ISSUES.filter((issue) => status === "all" || issue.status === status).map(
      ({ id, title, severity, status, file }) => ({ id, title, severity, status, file }),
    );
  },
});

const searchCode = tool({
  description: "Search the repository for a piece of text. Returns matching lines.",
  inputSchema: z.object({ query: z.string().min(2).max(100) }),
  execute: async ({ query }) => {
    await wait(900);
    const needle = query.toLowerCase();
    return Object.entries(DEMO_REPO).flatMap(([path, lines]) =>
      lines.flatMap((code, index) => (code.toLowerCase().includes(needle) ? [{ path, line: index + 1, code }] : [])),
    );
  },
});

const runProof = tool({
  description: "Run a live check that proves an issue is real. Takes an issue id.",
  inputSchema: z.object({ issueId: z.string() }),
  execute: async ({ issueId }) => {
    await wait(1400);
    const proof = Object.hasOwn(PROOFS, issueId) ? PROOFS[issueId] : undefined;
    // A thrown error becomes an output-error part in the chat.
    if (!proof) throw new ToolUserError(`There is no live check for "${issueId}" yet.`);
    return proof;
  },
});

export const askTools = { listIssues, searchCode, runProof };

export type AskMessage = UIMessage<never, never, InferUITools<typeof askTools>>;
