// What the "code map" part of the Code page shows, worked out from the rows of code_files. Pure: no I/O, so it is unit-tested.
// The page passes only light rows (no symbols, no paths): counts, env var names and a redaction total are all it needs.

export const KIND_ORDER = ["page", "route", "server_action", "component", "lib", "migration", "config", "test", "other"] as const;
export type FileKind = (typeof KIND_ORDER)[number];

export const KIND_LABEL: Record<FileKind, string> = {
  page: "Pages",
  route: "API routes",
  server_action: "Server actions",
  component: "Components",
  lib: "Libraries",
  migration: "Migrations",
  config: "Config",
  test: "Tests",
  other: "Other",
};

export const isFileKind = (value: unknown): value is FileKind => typeof value === "string" && (KIND_ORDER as readonly string[]).includes(value);

export type FileSummaryRow = { kind: string; env_vars: string[]; is_client: boolean; redactions: number };

export type KindCount = { kind: FileKind; label: string; count: number };
export type EnvVarUse = { name: string; files: number; inClient: boolean };

export type CodeMapSummary = {
  total: number;
  kinds: KindCount[]; // only kinds that have files, in a fixed order
  envVars: EnvVarUse[]; // sorted by name
  redactions: number; // secrets we masked, over all files
};

export function summarizeFiles(rows: readonly FileSummaryRow[]): CodeMapSummary {
  const counts = new Map<FileKind, number>();
  const env = new Map<string, EnvVarUse>();
  let redactions = 0;

  for (const row of rows) {
    // A kind we don't know (an older or newer index) is shown as "Other", never dropped.
    const kind = isFileKind(row.kind) ? row.kind : "other";
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
    redactions += row.redactions;
    for (const name of new Set(row.env_vars)) {
      const entry = env.get(name) ?? { name, files: 0, inClient: false };
      entry.files += 1;
      if (row.is_client) entry.inClient = true;
      env.set(name, entry);
    }
  }

  return {
    total: rows.length,
    kinds: KIND_ORDER.filter((kind) => (counts.get(kind) ?? 0) > 0).map((kind) => ({ kind, label: KIND_LABEL[kind], count: counts.get(kind) ?? 0 })),
    envVars: [...env.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
    redactions,
  };
}

// The stack column of code_indexes is JSON from detectStack. Anything unexpected is ignored, never shown raw.
export function stackChips(stack: unknown): string[] {
  if (stack === null || typeof stack !== "object" || Array.isArray(stack)) return [];
  const value = stack as Record<string, unknown>;
  const chips: string[] = [];
  const version = (raw: unknown) => (typeof raw === "string" && /^[0-9A-Za-z.+-]{1,20}$/.test(raw) ? ` ${raw}` : "");
  if (typeof value.next === "string") chips.push(`Next.js${version(value.next)}`);
  if (typeof value.react === "string") chips.push(`React${version(value.react)}`);
  if (value.supabase === true) chips.push("Supabase");
  if (value.stripe === true) chips.push("Stripe");
  if (value.openai === true) chips.push("OpenAI");
  if (value.anthropic === true) chips.push("Anthropic");
  if (value.vercelAi === true) chips.push("Vercel AI SDK");
  return chips;
}
