"use server";

// Harmless demo actions for the design preview. They never touch a database or an AI provider: search answers with fake matches,
// and "Re-index" only moves you to the "running" fake state.
import { redirect } from "next/navigation";
import { DEMO_RESULT } from "@/lib/code-index/fixtures";
import type { SearchOutcome } from "@/lib/code-index/search-core";

export async function demoSearch(): Promise<SearchOutcome> {
  return DEMO_RESULT;
}

export async function demoReindex(): Promise<void> {
  redirect("/design/code?state=running-reindex");
}
