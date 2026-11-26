// Where to land right after a successful sign-in. The `next` address can point INSIDE a workspace (the proxy sends a signed-out
// visitor to /login?next=/o/<workspace>/...). If a different person signs in from that page, they are not a member, and the
// workspace would answer 404. So: not a member = /onboarding, which sends them to their own first workspace, or to "create your
// workspace". Read as the signed-in person (the database rules decide), never with the admin key.
import "server-only";
import { DEFAULT_NEXT, workspaceSlugOf } from "@/lib/safe-next";
import type { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

export async function landingAfterSignIn(supabase: Db, next: string): Promise<string> {
  const slug = workspaceSlugOf(next);
  if (!slug) return next;

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return DEFAULT_NEXT;

  // Same question requireOrg() asks: is there a membership of mine whose workspace has this address?
  const { data: membership, error } = await supabase.from("org_members").select("org_id, orgs!inner(slug)").eq("user_id", userId).eq("orgs.slug", slug).maybeSingle();
  if (error) {
    console.warn(`[auth] could not check the workspace after sign-in: code=${error.code}`);
    return DEFAULT_NEXT; // /onboarding checks again and says what is wrong, instead of a 404
  }
  return membership ? next : DEFAULT_NEXT;
}
