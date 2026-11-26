"use server";

// The search box. A Server Action is a public endpoint, so everything is checked here, whatever the page showed:
// the person must be a MEMBER of this workspace (members may search; only owners and admins may index), the app must
// belong to it, and the question is validated. At most 30 searches per person per minute.
// It always answers with a plain object (never a thrown error), and logs only short codes: never the question or any code.
import { z } from "zod";
import { getAppForIndex } from "@/lib/code-index/db";
import { searchCode } from "@/lib/code-index/search";
import { QuerySchema, type SearchOutcome } from "@/lib/code-index/search-core";
import { requireOrg } from "@/lib/orgs";
import { allowSearch } from "@/lib/search-rate-limit";
import { SLUG_PATTERN } from "@/lib/slug";

const Ids = z.object({ slug: z.string().regex(SLUG_PATTERN), appId: z.uuid() });

export async function searchAction(slug: string, appId: string, query: string): Promise<SearchOutcome> {
  const ids = Ids.safeParse({ slug, appId });
  if (!ids.success) return { status: "error" };
  const text = QuerySchema.safeParse(query);
  if (!text.success) return { status: "invalid", message: text.error.issues[0]?.message ?? "Check your question and try again." };

  // Not a member: a plain 404, like every other page of the workspace.
  const { org, userId } = await requireOrg(ids.data.slug);

  // Everything below can fail (the database, the embedding service). A failure is an answer, never a thrown error.
  try {
    const app = await getAppForIndex({ orgId: org.id, appId: ids.data.appId });
    if (!app) return { status: "error" };

    const allowed = await allowSearch(userId);
    if (!allowed.ok) return { status: "limited", retryAfterSeconds: allowed.retryAfterSeconds };

    const result = await searchCode({ orgId: org.id, appId: ids.data.appId, query: text.data, limit: 8 });
    if (result.commitSha === null) return { status: "no_index" };
    return { status: "ok", hits: result.hits, ms: result.ms, commitSha: result.commitSha, keywordOnly: result.keywordOnly };
  } catch (error) {
    console.warn(`[search] failed: code=${(error as { code?: unknown }).code ?? "unknown"}`);
    return { status: "error" };
  }
}
