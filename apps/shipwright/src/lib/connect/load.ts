// Builds what the connect page shows, from the database and (when connected) GitHub and Supabase.
// Everything about the workspace is read AS THE SIGNED-IN USER, so the database rules decide what is visible. The page never
// shows a raw error: a failure becomes a state ("needs reconnect", a calm message code), never the text of the failure.
import "server-only";
import { isGitHubConfigured, isSupabaseOAuthConfigured } from "@/lib/env.server";
import { explainGitHubError, describeForLog } from "@/lib/github/errors";
import { listInstallationRepos, type InstallationRepo } from "@/lib/github/app";
import type { OrgRole } from "@/lib/orgs";
import { createClient } from "@/lib/supabase/server";
import { MgmtApiError, NeedsReconnectError } from "@/lib/supabase-mgmt/errors";
import { listSupabaseProjects } from "@/lib/supabase-mgmt/client";
import type { ConnectInput, GitHubStep, SupabaseStep } from "./state";

type Db = Awaited<ReturnType<typeof createClient>>;
export type ConnectionRow = { id: string; provider: string; external_id: string; status: string; app_id: string | null };
type AppRow = { id: string; repo_full_name: string; default_branch: string; supabase_project_ref: string | null };

// One connection of this workspace, with the columns a browser may read (never the vault reference).
export async function findConnection(db: Db, orgId: string, provider: "github_app" | "supabase_oauth"): Promise<ConnectionRow | null> {
  const { data, error } = await db.from("connections").select("id, provider, external_id, status, app_id").eq("org_id", orgId).eq("provider", provider).maybeSingle();
  if (error) throw new Error(`Could not read connections (code ${error.code}).`);
  return data;
}

async function loadGitHub(gh: ConnectionRow | null, apps: AppRow[], pending: boolean): Promise<GitHubStep> {
  if (!isGitHubConfigured()) return { status: "coming_soon" };
  if (!gh) return pending ? { status: "pending_approval" } : { status: "not_connected" };
  if (gh.status === "error") return { status: "needs_reconnect" };

  // The page where the person manages this installation on GitHub (to add repositories or uninstall).
  const installUrl = `https://github.com/settings/installations/${encodeURIComponent(gh.external_id)}`;
  const app = gh.app_id ? apps.find((candidate) => candidate.id === gh.app_id) : undefined;
  if (app) return { status: "connected", repo: { fullName: app.repo_full_name, defaultBranch: app.default_branch }, installUrl };

  const installationId = Number(gh.external_id);
  if (!Number.isSafeInteger(installationId)) return { status: "error", code: "unknown" };
  let repos: InstallationRepo[];
  try {
    repos = await listInstallationRepos(installationId);
  } catch (error) {
    const info = explainGitHubError(error);
    console.warn(`[connect] could not list repositories: ${describeForLog(info, { installation: installationId })}`);
    if (info.kind === "auth" || info.kind === "not_found") return { status: "needs_reconnect" };
    return { status: "error", code: info.kind === "rate_limit" ? "rate_limited" : "unknown" };
  }
  return repos.length === 0 ? { status: "no_repos", installUrl } : { status: "pick_repo", repos, installUrl };
}

async function loadSupabase(orgId: string, sb: ConnectionRow | null, app: AppRow | undefined): Promise<SupabaseStep> {
  if (!isSupabaseOAuthConfigured()) return { status: "coming_soon" };
  if (!sb) return { status: "not_connected" };
  if (sb.status === "error") return { status: "needs_reconnect" };

  try {
    const projects = await listSupabaseProjects({ id: sb.id, orgId, externalId: sb.external_id });
    // Only the projects of the Supabase organization that was connected.
    const mine = projects.filter((project) => project.organizationSlug === sb.external_id);
    const chosen = app?.supabase_project_ref ? mine.find((project) => project.ref === app.supabase_project_ref) : undefined;
    if (app?.supabase_project_ref) {
      return { status: "connected", project: { ref: app.supabase_project_ref, name: chosen?.name ?? app.supabase_project_ref, region: chosen?.region ?? "unknown" } };
    }
    return mine.length === 0
      ? { status: "no_projects" }
      : { status: "pick_project", projects: mine.map(({ ref, name, region, status }) => ({ ref, name, region, status })) };
  } catch (error) {
    if (error instanceof NeedsReconnectError) return { status: "needs_reconnect" };
    const status = error instanceof MgmtApiError ? error.status : undefined;
    console.warn(`[connect] could not list Supabase projects: status=${status ?? "unknown"}`);
    return { status: "error", code: status === 429 ? "rate_limited" : "unknown" };
  }
}

export async function loadConnectInput(args: { orgId: string; role: OrgRole; status?: string; step?: string }): Promise<ConnectInput> {
  const db = await createClient();
  const [gh, sb, appsResult] = await Promise.all([
    findConnection(db, args.orgId, "github_app"),
    findConnection(db, args.orgId, "supabase_oauth"),
    db.from("apps").select("id, repo_full_name, default_branch, supabase_project_ref").eq("org_id", args.orgId),
  ]);
  if (appsResult.error) throw new Error(`Could not read apps (code ${appsResult.error.code}).`);
  const apps = appsResult.data ?? [];

  const github = await loadGitHub(gh, apps, args.status === "github_pending");
  // Step 2 is only reached once a repository is chosen, so don't call Supabase before that.
  const app = gh?.app_id ? apps.find((candidate) => candidate.id === gh.app_id) : undefined;
  const supabase: SupabaseStep = github.status === "connected" ? await loadSupabase(args.orgId, sb, app) : isSupabaseOAuthConfigured() ? { status: "not_connected" } : { status: "coming_soon" };

  return { role: args.role, github, supabase, skipSupabase: args.step === "ready" };
}
