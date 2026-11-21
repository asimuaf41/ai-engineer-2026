// Step 1 of connecting GitHub: send an owner or admin to GitHub to install the Shipwright app on their account.
//   /api/github/install?org=<workspace address>
// We remember WHO started this (a signed, one-use cookie) so that when GitHub sends the person back, we can tell the
// link really came from this browser and not from someone else's crafted address.
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getGitHubConfig } from "@/lib/env.server";
import { ADMIN_ROLES, requireOrg } from "@/lib/orgs";
import { createState } from "@/lib/oauth-state";
import { SLUG_PATTERN } from "@/lib/slug";

// The app's address name (github.com/apps/<this>). Checked, because it ends up in the address we redirect to.
const APP_SLUG = /^[A-Za-z0-9][A-Za-z0-9-]{0,98}$/;

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("org") ?? "";
  if (!SLUG_PATTERN.test(slug)) redirect("/onboarding");

  const config = getGitHubConfig();
  if (!config || !APP_SLUG.test(config.GITHUB_APP_SLUG)) redirect(`/o/${slug}/connect?error=github_not_configured`);

  // Only an owner or an admin of this workspace. Anyone else gets a plain 404.
  const { org } = await requireOrg(slug, ADMIN_ROLES);

  const state = await createState({ orgId: org.id, provider: "github", extra: { slug: org.slug } });
  // The host is fixed (github.com) and the app name was checked above, so this can never be sent somewhere else.
  redirect(`https://github.com/apps/${config.GITHUB_APP_SLUG}/installations/new?state=${encodeURIComponent(state)}`);
}
