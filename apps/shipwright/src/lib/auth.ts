// Helpers for pages and actions that need to know who is signed in. Server only.
// Never use supabase.auth.getSession() on the server: it reads the cookie without checking it. getClaims() verifies the token.
import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isSupabaseConfigured } from "@/lib/env.client";
import { DEFAULT_NEXT, safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export { DEFAULT_NEXT, safeNext };

// For Server Components and Server Actions that are private. Signed out = sent to /login, then back to `next`.
export async function requireUser(next: string = DEFAULT_NEXT): Promise<{ id: string; email: string | null }> {
  // A private page depends on who is asking, so it must never be built ahead of time (even when Supabase isn't set up).
  await connection();
  const toLogin = `/login?next=${encodeURIComponent(safeNext(next))}`;
  // Not set up here (CI, a fresh deploy): /login explains that, instead of an error page.
  if (!isSupabaseConfigured()) redirect(toLogin);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims) redirect(toLogin);
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}
