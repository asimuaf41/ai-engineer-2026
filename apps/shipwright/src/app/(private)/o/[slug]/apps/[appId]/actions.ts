"use server";

// "Index my code". A Server Action is a public endpoint, so everything is checked here again, whatever the page showed:
// the person must be an OWNER or ADMIN of this workspace, the app must belong to it, and it must be the app that the
// GitHub connection is linked to. The repository and branch come from our database, never from the form.
//
// The click returns at once: the slow part (download, read, embed) runs after the response, in runIndex().
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { createIndex, failStaleIndexes, getAppForIndex } from "@/lib/code-index/db";
import { resolveCommitSha } from "@/lib/code-index/fetch-repo";
import { explainIndexError } from "@/lib/code-index/index-errors";
import { IndexTimeoutError, STALE_AFTER_MS } from "@/lib/code-index/index-plan";
import { runIndex } from "@/lib/code-index/run-index";
import { findConnection } from "@/lib/connect/load";
import { isEmbeddingConfigured } from "@/env";
import { ADMIN_ROLES, requireOrg } from "@/lib/orgs";
import { SLUG_PATTERN } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

const Input = z.object({ slug: z.string().regex(SLUG_PATTERN), appId: z.uuid() });

export async function startIndex(slug: string, appId: string): Promise<void> {
  const parsed = Input.safeParse({ slug, appId });
  if (!parsed.success) redirect(SLUG_PATTERN.test(slug) ? `/o/${slug}/connect?error=unknown` : "/onboarding");

  const { org, userId } = await requireOrg(parsed.data.slug, ADMIN_ROLES);
  const page = `/o/${org.slug}/connect`;

  // The app must belong to this workspace (checked on the server, with the workspace in the filter).
  const app = await getAppForIndex({ orgId: org.id, appId: parsed.data.appId });
  if (!app) redirect(`${page}?error=unknown`);

  // An active GitHub connection that is linked to THIS app. The installation id is saved there, not in the form.
  const gh = await findConnection(await createClient(), org.id, "github_app");
  const installationId = Number(gh?.external_id);
  if (!gh || gh.status !== "active" || gh.app_id !== parsed.data.appId || !Number.isSafeInteger(installationId)) {
    redirect(`${page}?error=needs_reconnect`);
  }
  if (!isEmbeddingConfigured()) redirect(`${page}?error=indexing_unavailable`);

  // A run that was stopped halfway (the server was restarted, or it ran out of time) must not block this app for ever.
  const timedOut = explainIndexError(new IndexTimeoutError()).message;
  let failure: string | null = null;
  let indexId: string | null = null;
  let commitSha: string | null = null;
  try {
    await failStaleIndexes({ orgId: org.id, appId: parsed.data.appId, olderThanMs: STALE_AFTER_MS, message: timedOut });
    commitSha = await resolveCommitSha({ installationId, repoFullName: app.repoFullName, ref: app.defaultBranch });
    indexId = await createIndex({ orgId: org.id, appId: parsed.data.appId, commitSha });
  } catch (error) {
    // 23505 = the database's own "one active index per app" rule: another run is going right now.
    const code = (error as { code?: unknown }).code;
    failure = code === "23505" ? "already_indexing" : explainIndexError(error).code === "github_access" ? "needs_reconnect" : "unknown";
  }
  if (failure || !indexId || !commitSha) redirect(`${page}?error=${failure ?? "unknown"}`);

  await recordAudit({ orgId: org.id, actorId: userId, action: "code_index.started", metadata: { index_id: indexId, app_id: parsed.data.appId } });

  const run = { orgId: org.id, appId: parsed.data.appId, indexId, installationId, repoFullName: app.repoFullName, commitSha, actorId: userId };
  // Runs after the response is sent. runIndex closes the run itself (ready, or failed with a message), so nothing is left to do here.
  after(async () => {
    try {
      await runIndex(run);
    } catch {
      // Already handled and logged inside runIndex.
    }
  });

  redirect(`/o/${org.slug}/apps/${parsed.data.appId}/code`);
}
