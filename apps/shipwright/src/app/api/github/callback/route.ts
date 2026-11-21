// Step 2: GitHub sends the person back here after they installed the app.
//   /api/github/callback?code=...&installation_id=...&setup_action=install&state=...
// Anyone can open this address with made-up values, so NOTHING in it is believed until it is checked:
//   1. the signed state cookie proves this browser started this flow, for this workspace, minutes ago (checked FIRST,
//      before we ask GitHub or the database anything);
//   2. the one-time code is swapped for a short-lived user token, used once and thrown away;
//   3. GitHub must confirm the person can really see that installation (installation_id in an address can be edited);
//   4. only then do we check they are still an owner or admin, and save the link.
// The user token is never stored and never logged.
import { notFound, redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { saveConnection } from "@/lib/connections";
import { isConnectErrorCode, type ConnectErrorCode } from "@/lib/connect/errors";
import { describeForLog, explainGitHubError } from "@/lib/github/errors";
import { exchangeCodeForUserToken, revokeUserToken, userCanSeeInstallation } from "@/lib/github/app";
import { readState } from "@/lib/oauth-state";
import { ADMIN_ROLES, requireOrg } from "@/lib/orgs";

const Query = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{10,100}$/).optional(),
  installation_id: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  // install = a new install; update = permissions or repositories changed; request = a member asked an owner to approve.
  setup_action: z.enum(["install", "update", "request"]).optional(),
  state: z.string().min(20).max(100),
});

// Send the person back to the connect page with one of OUR error codes (never anything from the address).
function back(code: ConnectErrorCode, slug: string | undefined): never {
  redirect(slug ? `/o/${slug}/connect?error=${code}` : `/onboarding?error=${code}`);
}

export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams);

  // 1. The state, before anything else. (readState always uses up the cookie, so a replay finds nothing.)
  const state = await readState("github", typeof raw.state === "string" ? raw.state : null);
  if (!state.ok) back("github_state", state.slug);
  const slug = state.extra.slug;
  if (!slug) back("github_state", undefined);

  const parsed = Query.safeParse(raw);
  if (!parsed.success) back("github_failed", slug);
  const { code, installation_id: installationId, setup_action: setupAction } = parsed.data;

  // A member asked their GitHub org owner to approve the app. Nothing to connect yet: show the "waiting" message.
  if (setupAction === "request") redirect(`/o/${slug}/connect?status=github_pending`);
  if (!code || !installationId) back("github_failed", slug);

  // 2 and 3. Swap the code, check the installation is really theirs, and always throw the token away.
  let problem: ConnectErrorCode | null = null;
  let userToken: string | null = null;
  try {
    userToken = await exchangeCodeForUserToken(code);
    if (!(await userCanSeeInstallation(userToken, installationId))) problem = "github_not_yours";
  } catch (error) {
    const info = explainGitHubError(error);
    console.warn(`[github] callback failed: ${describeForLog(info, { installation: installationId })}`);
    problem = info.kind === "rate_limit" ? "rate_limited" : "github_failed";
  } finally {
    if (userToken) await revokeUserToken(userToken);
  }
  if (problem && isConnectErrorCode(problem)) back(problem, slug);

  // 4. Still an owner or admin of the workspace the flow was started for? (Roles can change within the 10 minutes.)
  const { org, userId } = await requireOrg(slug, ADMIN_ROLES);
  if (org.id !== state.orgId) notFound();

  await saveConnection({ orgId: org.id, provider: "github_app", externalId: String(installationId), actorId: userId });
  await recordAudit({
    orgId: org.id,
    actorId: userId,
    action: "connection.github.created",
    metadata: { installation_id: installationId, setup_action: setupAction ?? null },
  });

  redirect(`/o/${slug}/connect?step=repo`);
}
