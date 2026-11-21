import type { Metadata } from "next";
import { LoginForm, type LoginError } from "@/components/auth/login-form";
import { PageTransition } from "@/components/page-transition";
import { isSupabaseConfigured } from "@/lib/env.client";
import { safeNext } from "@/lib/safe-next";

// Not for search engines: a sign-in page has nothing to rank for.
export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> }) {
  const { next, error } = await searchParams;
  // A link can carry anything (a list, a huge string), so accept one short string only, then check it.
  const nextPath = safeNext(typeof next === "string" ? next : undefined);
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
