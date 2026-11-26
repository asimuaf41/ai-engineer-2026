// Fake data for the design preview at /design/code. Nothing here is real, and the real page never imports this file.
import type { CodeMapSummary } from "./code-map-view.ts";
import type { CodeHit, SearchOutcome } from "./search-core.ts";
import type { CodeIndexData, IndexInfo } from "./view-data.ts";

const SLUG = "acme-labs-x7k2";
const APP_ID = "00000000-0000-4000-8000-000000000001";
const SHA = "3f9c2ab81d0e4f6a7b5c8d9e0a1b2c3d4e5f6a7b";

const readyIndex: IndexInfo = {
  status: "ready",
  stopped: false,
  commitSha: SHA,
  filesCount: 1204,
  chunksCount: 3890,
  reusedChunks: 3500,
  isSample: false,
  embedTokens: 150_000,
  costUsd: 0.018,
  error: null,
  startedAt: "2026-11-24T09:00:10Z",
  finishedAt: "2026-11-24T09:03:40Z",
};

const map: CodeMapSummary = {
  total: 1204,
  kinds: [
    { kind: "page", label: "Pages", count: 12 },
    { kind: "route", label: "API routes", count: 8 },
    { kind: "server_action", label: "Server actions", count: 3 },
    { kind: "component", label: "Components", count: 94 },
    { kind: "lib", label: "Libraries", count: 311 },
    { kind: "migration", label: "Migrations", count: 5 },
    { kind: "config", label: "Config", count: 22 },
    { kind: "test", label: "Tests", count: 148 },
    { kind: "other", label: "Other", count: 601 },
  ],
  envVars: [
    { name: "ANTHROPIC_API_KEY", files: 2, inClient: false },
    { name: "DATABASE_URL", files: 3, inClient: false },
    { name: "NEXT_PUBLIC_SUPABASE_URL", files: 4, inClient: true },
    { name: "STRIPE_SECRET_KEY", files: 1, inClient: true },
    { name: "SUPABASE_SECRET_KEY", files: 2, inClient: false },
  ],
  redactions: 0,
};

const base: CodeIndexData = {
  slug: SLUG,
  appId: APP_ID,
  repoFullName: "acme-labs/shop-frontend",
  canManage: true,
  latest: readyIndex,
  ready: readyIndex,
  filesRead: null,
  map,
  stack: ["Next.js 16.4.3", "React 19.2.0", "Supabase", "Stripe", "Anthropic"],
  selectedKind: null,
  kindFiles: null,
};

export const HITS: CodeHit[] = [
  {
    path: "src/lib/billing/check-paid.ts",
    symbol: "hasPaid",
    startLine: 12,
    endLine: 34,
    snippet: "export async function hasPaid(orgId: string) {\n  const sub = await getSubscription(orgId);\n  return sub?.status === \"active\";\n}",
    matchedBy: "both",
  },
  {
    path: "src/app/api/webhooks/stripe/route.ts",
    symbol: "POST",
    startLine: 1,
    endLine: 40,
    snippet: "export async function POST(req: Request) {\n  const signature = req.headers.get(\"stripe-signature\");\n  const event = stripe.webhooks.constructEvent(body, signature, secret);",
    matchedBy: "meaning",
  },
  {
    path: "src/lib/supabase/admin.ts",
    symbol: "createAdminClient",
    startLine: 5,
    endLine: 18,
    snippet: "export function createAdminClient() {\n  return createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });\n}",
    matchedBy: "keyword",
  },
];

const resultsOutcome: SearchOutcome = { status: "ok", hits: HITS, ms: 84, commitSha: SHA, keywordOnly: false };

export type CodeFixture = { data: CodeIndexData; initial?: { query: string; outcome: SearchOutcome } };

const CODE_FIXTURES = {
  ready: { data: base },
  "kind-open": {
    data: {
      ...base,
      selectedKind: "route",
      kindFiles: {
        total: 8,
        files: [
          { path: "src/app/api/chat/route.ts", symbols: [{ name: "POST", kind: "function", exported: true }], envVars: ["ANTHROPIC_API_KEY"], isClient: false },
          {
            path: "src/app/api/webhooks/stripe/route.ts",
            symbols: [
              { name: "POST", kind: "function", exported: true },
              { name: "verify", kind: "function", exported: false },
            ],
            envVars: ["STRIPE_SECRET_KEY"],
            isClient: false,
          },
        ],
      },
    } satisfies CodeIndexData,
  },
  results: { data: base, initial: { query: "Where do we check if the user has paid?", outcome: resultsOutcome } },
  "keyword-only": { data: base, initial: { query: "SUPABASE_SECRET_KEY", outcome: { ...resultsOutcome, keywordOnly: true } satisfies SearchOutcome } },
  "no-matches": { data: base, initial: { query: "quantum entanglement", outcome: { status: "ok", hits: [], ms: 12, commitSha: SHA, keywordOnly: false } satisfies SearchOutcome } },
  limited: { data: base, initial: { query: "payments", outcome: { status: "limited", retryAfterSeconds: 42 } satisfies SearchOutcome } },
  redactions: { data: { ...base, map: { ...map, redactions: 3 } } },
  running: {
    data: {
      ...base,
      latest: { ...readyIndex, status: "running", finishedAt: null, startedAt: "2026-11-24T10:00:00Z" },
      ready: null,
      filesRead: 640,
      map: null,
      stack: [],
    },
  },
  "running-reindex": {
    data: { ...base, latest: { ...readyIndex, status: "running", finishedAt: null, startedAt: "2026-11-24T10:00:00Z" }, filesRead: null },
  },
  failed: {
    data: {
      ...base,
      latest: { ...readyIndex, status: "failed", finishedAt: "2026-11-24T10:01:00Z", error: "Our AI provider is busy. Please try again in a few minutes." },
    },
  },
  stopped: { data: { ...base, latest: { ...readyIndex, status: "running", stopped: true, finishedAt: null } } },
  empty: { data: { ...base, latest: null, ready: null, map: null, stack: [] } },
  "no-files": { data: { ...base, map: { ...map, total: 0, kinds: [], envVars: [] } } },
  "no-env": { data: { ...base, map: { ...map, envVars: [] } } },
  member: { data: { ...base, canManage: false } },
  "member-empty": { data: { ...base, canManage: false, latest: null, ready: null, map: null, stack: [] } },
} satisfies Record<string, CodeFixture>;

export type CodeFixtureName = keyof typeof CODE_FIXTURES;
export const CODE_FIXTURE_NAMES = Object.keys(CODE_FIXTURES) as CodeFixtureName[];
export const isCodeFixtureName = (value: unknown): value is CodeFixtureName => typeof value === "string" && Object.hasOwn(CODE_FIXTURES, value);
export const getCodeFixture = (name: CodeFixtureName): CodeFixture => CODE_FIXTURES[name];

export const DEMO_RESULT: SearchOutcome = resultsOutcome;
