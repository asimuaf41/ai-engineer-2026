"use server";

// What the buttons on the connect page do. Server Actions are public endpoints: anyone can call them with anything, and the
// hidden form fields are just input. So every action:
//   - checks the person is an OWNER or ADMIN of that workspace (the page hiding a button is not security);
//   - validates its fields with zod;
//   - never trusts a value it can look up itself (the repository, the project and the organization are checked again
//     against GitHub and Supabase, and the app is found from the saved connection, not from the form).
// Failures go back to the page with one of our error codes. Nothing here logs a token or a name.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { revokeConnection, saveConnection } from "@/lib/connections";
import { findConnection } from "@/lib/connect/load";
import { listInstallationRepos, type InstallationRepo } from "@/lib/github/app";
import { describeForLog, explainGitHubError } from "@/lib/github/errors";
import { ADMIN_ROLES, requireOrg } from "@/lib/orgs";
import { SLUG_PATTERN } from "@/lib/slug";
import { STALE_AFTER_MS } from "@/lib/code-index/index-plan";
import { startIndex } from "../apps/[appId]/actions";
import { createClient } from "@/lib/supabase/server";
import { listSupabaseProjects } from "@/lib/supabase-mgmt/client";
import { MgmtApiError, NeedsReconnectError } from "@/lib/supabase-mgmt/errors";
import type { SupabaseProject } from "@/lib/supabase-mgmt/api";

const Slug = z.string().regex(SLUG_PATTERN);
const REPO = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;

const text = (formData: FormData, name: string): string => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

// ---------------------------------------------------------------------------------------------------------------------

export async function chooseRepoAction(formData: FormData): Promise<void> {
  const parsed = z.object({ slug: Slug, fullName: z.string().regex(REPO) }).safeParse({ slug: text(formData, "slug"), fullName: text(formData, "fullName") });
  const slugOnly = Slug.safeParse(text(formData, "slug"));
  if (!parsed.success) redirect(slugOnly.success ? `/o/${slugOnly.data}/connect?error=unknown` : "/onboarding");

  const { org, userId } = await requireOrg(parsed.data.slug, ADMIN_ROLES);
  const page = `/o/${org.slug}/connect`;
  const db = await createClient();

  const gh = await findConnection(db, org.id, "github_app");
  if (!gh) redirect(`${page}?error=needs_reconnect`);

  // The repository must be one the installation can really reach. The form is not trusted.
  const installationId = Number(gh.external_id);
  if (!Number.isSafeInteger(installationId)) redirect(`${page}?error=needs_reconnect`);
  let repos: InstallationRepo[] | null = null;
  let failure: string | null = null;
  try {
    repos = await listInstallationRepos(installationId);
  } catch (error) {
    const info = explainGitHubError(error);
    console.warn(`[connect] choose repo: ${describeForLog(info)}`);
    failure = info.kind === "auth" || info.kind === "not_found" ? "needs_reconnect" : info.kind === "rate_limit" ? "rate_limited" : "unknown";
  }
  if (failure) redirect(`${page}?error=${failure}`);
  const repo = repos?.find((candidate) => candidate.fullName === parsed.data.fullName);
  if (!repo) redirect(`${page}?error=unknown`);

  const name = repo.fullName.split("/")[1] ?? repo.fullName;
  const existing = await db.from("apps").select("id").eq("org_id", org.id).eq("repo_full_name", repo.fullName).maybeSingle();
  let appId = existing.data?.id;
  let created = false;
  if (appId) {
    const { error } = await db.from("apps").update({ name, default_branch: repo.defaultBranch }).eq("id", appId);
    if (error) redirect(`${page}?error=unknown`);
  } else {
    // Insert first, then look it up: the database refuses to read a row back in the same statement.
    const { error } = await db.from("apps").insert({ org_id: org.id, name, repo_full_name: repo.fullName, default_branch: repo.defaultBranch });
    if (error) {
      console.warn(`[connect] could not create the app: code=${error.code}`);
      redirect(`${page}?error=unknown`);
    }
    created = true;
    appId = (await db.from("apps").select("id").eq("org_id", org.id).eq("repo_full_name", repo.fullName).maybeSingle()).data?.id;
  }
  if (!appId) redirect(`${page}?error=unknown`);

  // Link the GitHub connection to the app (no token for GitHub: only the installation id is stored).
  await saveConnection({ orgId: org.id, provider: "github_app", externalId: gh.external_id, appId, actorId: userId });
  if (created) await recordAudit({ orgId: org.id, actorId: userId, action: "app.created", metadata: { app_id: appId, repo: repo.fullName } });

  revalidatePath(page);
  redirect(page);
}

// ---------------------------------------------------------------------------------------------------------------------

export async function chooseProjectAction(formData: FormData): Promise<void> {
  const parsed = z.object({ slug: Slug, ref: z.string().regex(/^[a-z]{20}$/) }).safeParse({ slug: text(formData, "slug"), ref: text(formData, "ref") });
  const slugOnly = Slug.safeParse(text(formData, "slug"));
  if (!parsed.success) redirect(slugOnly.success ? `/o/${slugOnly.data}/connect?error=unknown` : "/onboarding");

  const { org, userId } = await requireOrg(parsed.data.slug, ADMIN_ROLES);
  const page = `/o/${org.slug}/connect`;
  const db = await createClient();

  // The app comes from the saved GitHub connection (step 1), never from the form.
  const gh = await findConnection(db, org.id, "github_app");
  const sb = await findConnection(db, org.id, "supabase_oauth");
  if (!gh?.app_id || !sb) redirect(`${page}?error=needs_reconnect`);

  let projects: SupabaseProject[] | null = null;
  let failure: string | null = null;
  try {
    projects = await listSupabaseProjects({ id: sb.id, orgId: org.id, externalId: sb.external_id });
  } catch (error) {
    failure = error instanceof NeedsReconnectError ? "needs_reconnect" : error instanceof MgmtApiError && error.status === 429 ? "rate_limited" : "unknown";
    console.warn(`[connect] choose project failed: ${failure}`);
  }
  if (failure) redirect(`${page}?error=${failure}`);
  // The project must exist AND belong to the Supabase organization that was connected.
  const project = projects?.find((candidate) => candidate.ref === parsed.data.ref && candidate.organizationSlug === sb.external_id);
  if (!project) redirect(`${page}?error=unknown`);

  const { error } = await db.from("apps").update({ supabase_project_ref: project.ref }).eq("id", gh.app_id).eq("org_id", org.id);
  if (error) {
    console.warn(`[connect] could not link the project: code=${error.code}`);
    redirect(`${page}?error=unknown`);
  }
  await saveConnection({ orgId: org.id, provider: "supabase_oauth", externalId: sb.external_id, appId: gh.app_id, actorId: userId });
  await recordAudit({ orgId: org.id, actorId: userId, action: "app.supabase_linked", metadata: { app_id: gh.app_id, project_ref: project.ref } });

  revalidatePath(page);
  redirect(page);
}

// ---------------------------------------------------------------------------------------------------------------------

export async function disconnectAction(formData: FormData): Promise<void> {
  const parsed = z.object({ slug: Slug, kind: z.enum(["github", "supabase"]) }).safeParse({ slug: text(formData, "slug"), kind: text(formData, "kind") });
  const slugOnly = Slug.safeParse(text(formData, "slug"));
  if (!parsed.success) redirect(slugOnly.success ? `/o/${slugOnly.data}/connect?error=unknown` : "/onboarding");

  const { org, userId } = await requireOrg(parsed.data.slug, ADMIN_ROLES);
  const page = `/o/${org.slug}/connect`;
  const db = await createClient();
  const { kind } = parsed.data;

  const connection = await findConnection(db, org.id, kind === "github" ? "github_app" : "supabase_oauth");
  let removedApps = 0;
  if (connection && kind === "github") {
    // Not while an index run is going: deleting its app would fail the run halfway, and its Voyage cost could not be logged.
    // (A run older than the stale limit is a dead one and doesn't block.)
    const since = new Date(Date.now() - STALE_AFTER_MS).toISOString();
    const running = await db.from("code_indexes").select("id").eq("org_id", org.id).in("status", ["queued", "running"]).gte("created_at", since).limit(1);
    if (running.error) redirect(`${page}?error=unknown`);
    if (running.data.length > 0) redirect(`${page}?error=already_indexing`);

    // Every app of this workspace came from this GitHub installation, so they go with it: the database deletes each app's
    // code index (map, chunks, vectors) in the same step. This is done first, so a failed delete leaves the connection in place and
    // the person can simply try again. If the revoke below fails afterwards, trying again also works (the delete then finds nothing).
    const removed = await db.from("apps").delete().eq("org_id", org.id).select("id");
    if (removed.error) {
      console.warn(`[connect] could not remove the apps on disconnect: code=${removed.error.code}`);
      redirect(`${page}?error=unknown`);
    }
    removedApps = removed.data?.length ?? 0;
  }
  if (connection) {
    // Deletes the token from Vault (Supabase) and removes the link. (back() and redirect() work by throwing, so they are never
    // called inside a try block: the outcome is kept and the redirect comes after.)
    let revoked = true;
    try {
      await revokeConnection(org.id, connection.id);
    } catch {
      console.warn(`[connect] could not revoke the ${kind} connection`);
      revoked = false;
    }
    if (revoked && kind === "supabase") {
      // The app no longer points at a project we can't reach.
      const gh = await findConnection(db, org.id, "github_app");
      if (gh?.app_id) await db.from("apps").update({ supabase_project_ref: null }).eq("id", gh.app_id).eq("org_id", org.id);
    }
    await recordAudit({
      orgId: org.id,
      actorId: userId,
      action: `connection.${kind}.${revoked ? "revoked" : "revoke_failed"}`,
      metadata: { connection_id: connection.id, ...(kind === "github" ? { apps_removed: removedApps } : {}) },
    });
    if (!revoked) redirect(`${page}?error=unknown`);
  }

  revalidatePath(page);
  revalidatePath(`/o/${org.slug}`, "layout"); // the "Code" link in the workspace bar
  redirect(page);
}

// ---------------------------------------------------------------------------------------------------------------------

// The "Index my code" button. A thin wrapper: the real checks and work are in apps/[appId]/actions.ts.
export async function startIndexAction(formData: FormData): Promise<void> {
  await startIndex(text(formData, "slug"), text(formData, "appId"));
}
