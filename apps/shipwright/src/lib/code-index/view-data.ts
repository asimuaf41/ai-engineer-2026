// The plain data the Code page is drawn from. The real page builds it from the database; the design preview builds it from
// fixtures, so the same view works for both. No "server-only": client components import the types too. Pure helpers only.
import type { CodeMapSummary, FileKind } from "./code-map-view.ts";

export type IndexInfo = {
  status: "queued" | "running" | "ready" | "failed";
  stopped: boolean; // queued/running for so long that the run must have died
  commitSha: string;
  filesCount: number;
  chunksCount: number;
  reusedChunks: number;
  isSample: boolean; // a development run that indexed only the first chunksCount chunks (DEV_INDEX_MAX_CHUNKS)
  embedTokens: number;
  costUsd: number;
  error: string | null; // the plain-English message saved by the indexer
  startedAt: string | null; // ISO
  finishedAt: string | null; // ISO
};

export type KindFile = {
  path: string;
  symbols: { name: string; kind: string; exported: boolean }[];
  envVars: string[];
  isClient: boolean;
};

export type CodeIndexData = {
  slug: string;
  appId: string;
  repoFullName: string;
  canManage: boolean; // owner or admin: may start an index
  latest: IndexInfo | null; // the newest run, whatever its state
  ready: IndexInfo | null; // the newest READY run: what the map and the search are about
  filesRead: number | null; // while running: files saved so far
  map: CodeMapSummary | null;
  stack: string[];
  selectedKind: FileKind | null;
  kindFiles: { files: KindFile[]; total: number } | null;
};

export const shortSha = (sha: string) => sha.slice(0, 7);

// $0.02, and for tiny amounts more digits so a real cost never shows as "$0.00": $0.0004. Exactly zero is "$0".
export function formatCost(usd: number): string {
  if (usd <= 0) return "$0";
  if (usd >= 0.01) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(4)}`;
}

// A date the server and the browser print the same way (fixed time zone), so there is no mismatch while the page loads.
const absolute = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
export const formatUtc = (iso: string): string => `${absolute.format(new Date(iso))} UTC`;

// "2 min ago". Used only in the browser, after the page has loaded (the server never prints "x ago").
export function relativeTime(iso: string, now: Date): string {
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(seconds)) return "";
  if (seconds < 45) return "just now";
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return format.format(-minutes, "minute").replace(/^1 minute ago$/, "1 min ago").replace(" minutes ago", " min ago");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return format.format(-hours, "hour");
  return format.format(-Math.round(hours / 24), "day");
}
