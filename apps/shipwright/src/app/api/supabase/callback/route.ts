// Supabase sends the person back here after they allowed (or refused) access.
//   /api/supabase/callback?code=...&state=...      (or ?error=access_denied&state=...)
// Like the GitHub callback, nothing in the address is believed until it is checked; the state cookie comes first.
// The tokens exist in one local variable and go straight into Vault. They are never logged.
import { notFound, redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { saveConnection } from "@/lib/connections";
import type { ConnectErrorCode } from "@/lib/connect/errors";
import { readState } from "@/lib/oauth-state";
import { ADMIN_ROLES, requireOrg } from "@/lib/orgs";
import { isValidVerifier } from "@/lib/pkce";
import { listOrganizations, type SupabaseOrg } from "@/lib/supabase-mgmt/api";
import { MgmtApiError, SupabaseOAuthError } from "@/lib/supabase-mgmt/errors";
import { exchangeSupabaseCode } from "@/lib/supabase-mgmt/oauth";
import { serializeTokenSet, type TokenSet } from "@/lib/supabase-mgmt/token-set";

const Query = z.object({
  code: z.string().min(1).max(500).optional(),
  error: z.string().max(100).optional(),
  state: z.string().min(20).max(100),
});

function back(code: ConnectErrorCode, slug: string | undefined): never {
  redirect(slug ? `/o/${slug}/connect?error=${code}` : `/onboarding?error=${code}`);
}

export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams);

  // 1. The state first (and it is used up here, so a replay finds nothing).
  const state = await readState("supabase", typeof raw.state === "string" ? raw.state : null);
  if (!state.ok) back("supabase_state", state.slug);
  const slug = state.extra.slug;
  const verifier = state.extra.verifier;
  if (!slug || !isValidVerifier(verifier)) back("supabase_state", slug);

  const parsed = Query.safeParse(raw);
  if (!parsed.success) back("supabase_failed", slug);
  const { code, error } = parsed.data;

  // The person pressed "Deny" (or something went wrong on Supabase's side). We never show Supabase's own words.
  if (error || !code) back(error === "access_denied" || (!error && !code) ? "access_denied" : "supabase_failed", slug);

  // 2. Swap the code (with the PKCE verifier) for tokens, and find which Supabase organization they can see.
  let tokens: TokenSet;
  let organizations: SupabaseOrg[];
  try {
    tokens = await exchangeSupabaseCode(code, verifier);
    organizations = await listOrganizations(tokens.access_token);
  } catch (failure) {
    // The status only, never the body. (back() works by throwing, so it is never called INSIDE a try block.)
    const status = failure instanceof SupabaseOAuthError || failure instanceof MgmtApiError ? failure.status : undefined;
    console.warn(`[supabase] callback failed: status=${status ?? "unknown"}`);
    const limited = (failure instanceof SupabaseOAuthError && failure.kind === "rate_limited") || (failure instanceof MgmtApiError && failure.status === 429);
    back(limited ? "rate_limited" : "supabase_failed", slug);
  }

  const first = organizations[0];
  if (!first) back("supabase_no_org", slug);
  // TODO: if the person can see several Supabase organizations, we use the first one. Letting them choose is a later improvement.
  const organizationSlug = first.slug;

  // 3. Still an owner or admin of the workspace the flow was started for?
  const { org, userId } = await requireOrg(slug, ADMIN_ROLES);
  if (org.id !== state.orgId) notFound();

  const connectionId = await saveConnection({
    orgId: org.id,
    provider: "supabase_oauth",
    externalId: organizationSlug,
    secret: serializeTokenSet(tokens),
    actorId: userId,
  });
  await recordAudit({ orgId: org.id, actorId: userId, action: "connection.supabase.created", metadata: { connection_id: connectionId, supabase_org: organizationSlug } });

  redirect(`/o/${slug}/connect?step=project`);
}
