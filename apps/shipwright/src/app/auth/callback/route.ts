// "Continue with GitHub" (and any later provider) ends here: after the provider, Supabase sends the person back with ?code=...
// We swap the code for a session (cookies) and send them on. A first-time user has no workspace yet, so `next` defaults to /onboarding.
// If the person cancels at GitHub there is no code (only ?error=...). Never log the code, tokens or the provider's error text.
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  let signedIn = false;
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      signedIn = !error;
      if (error) console.warn(`[auth] sign-in code rejected: code=${error.code ?? "unknown"}`);
    } catch {
      // A network failure throws instead of returning { error }. Still a plain "couldn't sign you in", never a 500 page.
      console.warn("[auth] sign-in code exchange failed");
    }
  }

  // redirect() works by throwing, so it stays OUTSIDE the try block above.
  redirect(signedIn ? next : "/login?error=oauth_failed");
}
