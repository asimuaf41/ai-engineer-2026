// Step 1 of connecting Supabase: send an owner or admin to Supabase to allow Shipwright to read their projects.
//   /api/supabase/connect?org=<workspace address>
// PKCE: we make a secret "verifier", send only its fingerprint to Supabase, and keep the verifier in the signed, one-use
// state cookie. A stolen sign-in code is useless without it. The cookie is signed (cannot be changed) but not encrypted:
// the browser's own user can read it, which is normal for PKCE. It never leaves the cookie.
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { isSupabaseOAuthConfigured } from "@/lib/env.server";
import { createState } from "@/lib/oauth-state";
import { ADMIN_ROLES, requireOrg } from "@/lib/orgs";
import { challengeFor, newVerifier } from "@/lib/pkce";
import { SLUG_PATTERN } from "@/lib/slug";
import { supabaseAuthorizeUrl } from "@/lib/supabase-mgmt/oauth";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("org") ?? "";
  if (!SLUG_PATTERN.test(slug)) redirect("/onboarding");
  if (!isSupabaseOAuthConfigured()) redirect(`/o/${slug}/connect?error=supabase_not_configured`);

  const { org } = await requireOrg(slug, ADMIN_ROLES);

  const verifier = newVerifier();
  const state = await createState({ orgId: org.id, provider: "supabase", extra: { slug: org.slug, verifier } });
  redirect(supabaseAuthorizeUrl(state, challengeFor(verifier)));
}
