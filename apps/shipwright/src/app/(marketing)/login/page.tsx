import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm, type LoginError } from "@/components/auth/login-form";
import { PageTransition } from "@/components/page-transition";
import { landingAfterSignIn } from "@/lib/after-sign-in";
import { isSupabaseConfigured } from "@/lib/env.client";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

// Not for search engines: a sign-in page has nothing to rank for.
export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> }) {
  const { next, error } = await searchParams;
  // A link can carry anything (a list, a huge string), so accept one short string only, then check it.
  const nextPath = safeNext(typeof next === "string" ? next : undefined);

  // Already signed in: there is nothing to do here. Go on to where they were headed (their workspace's connect page by default;
  // /onboarding sends a new person to "create your workspace"). redirect() throws, so it stays outside any try block.
  let signedInLanding: string | null = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) signedInLanding = await landingAfterSignIn(supabase, nextPath);
  }
  if (signedInLanding) redirect(signedInLanding);
  // Only the two messages we know. Any other ?error= value shows nothing, so a link can't put text on the page.
  const loginError: LoginError | null = error === "link_invalid" || error === "oauth_failed" ? error : null;

  return (
    <PageTransition>
      <div className="container-page flex justify-center py-16 sm:py-24">
        <LoginForm next={nextPath} error={loginError} configured={isSupabaseConfigured()} />
      </div>
    </PageTransition>
  );
}
