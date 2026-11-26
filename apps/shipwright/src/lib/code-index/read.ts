// What the Code page reads, AS THE SIGNED-IN PERSON (the user client), so the database rules (RLS) decide what is visible.
// Only the code MAP is read here (file kinds, symbols, env var names). The code itself (code_chunks) is server-only and is never touched.
// Server only. The API returns at most 1,000 rows per request, and a repo can have 5,000 files, so reads page through.
import "server-only";
import type { FileKind, FileSummaryRow } from "@/lib/code-index/code-map-view";
import { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

const PAGE = 1000;
const MAX_ROWS = 6000; // a safety stop: an index never has more than 5,000 files

export type SymbolLite = { name: string; kind: string; exported: boolean };
export type KindFile = { path: string; symbols: SymbolLite[]; envVars: string[]; isClient: boolean };

// Light rows of every file of an index: enough for counts, env vars and the redaction total, without paths or symbols.
export async function readFileRows(db: Db, indexId: string): Promise<FileSummaryRow[]> {
  const rows: FileSummaryRow[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await db
      .from("code_files")
      .select("kind, env_vars, is_client, redactions")
      .eq("index_id", indexId)
      .order("path")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Could not read the code map (code ${error.code}).`);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

// How many files are saved so far (shown while an index is still being built).
export async function countFiles(db: Db, indexId: string): Promise<number> {
  const { count, error } = await db.from("code_files").select("id", { count: "exact", head: true }).eq("index_id", indexId);
  if (error) throw new Error(`Could not count files (code ${error.code}).`);
  return count ?? 0;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

// symbols is JSON from the indexer. Keep only what we show, defensively.
function readSymbols(value: unknown): SymbolLite[] {
  if (!Array.isArray(value)) return [];
  const symbols: SymbolLite[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.name !== "string" || typeof item.kind !== "string") continue;
    symbols.push({ name: item.name.slice(0, 80), kind: item.kind.slice(0, 20), exported: item.exported === true });
    if (symbols.length >= 12) break;
  }
  return symbols;
}

// The files of ONE kind (what opens when a chip is clicked), at most `limit`, plus how many there are in all.
export async function readFilesOfKind(db: Db, indexId: string, kind: FileKind, limit = 100): Promise<{ files: KindFile[]; total: number }> {
  const { data, count, error } = await db
    .from("code_files")
    .select("path, symbols, env_vars, is_client", { count: "exact" })
    .eq("index_id", indexId)
    .eq("kind", kind)
    .order("path")
    .limit(limit);
  if (error) throw new Error(`Could not read the files (code ${error.code}).`);
  return {
    files: data.map((row) => ({ path: row.path, symbols: readSymbols(row.symbols), envVars: row.env_vars, isClient: row.is_client })),
    total: count ?? data.length,
  };
}
