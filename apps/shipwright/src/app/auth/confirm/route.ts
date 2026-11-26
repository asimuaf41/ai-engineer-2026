// The sign-in email's button lands here: /auth/confirm?token_hash=...&type=email
// We swap the one-time token for a session (cookies), then send the person on. Never log the token.
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { landingAfterSignIn } from "@/lib/after-sign-in";
import { DEFAULT_NEXT, NEXT_COOKIE, NEXT_COOKIE_PATH, safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

// Only the kinds of email link we send. Anything else in the URL is ignored.
const OTP_TYPES: readonly EmailOtpType[] = ["email", "magiclink", "signup", "recovery", "invite", "email_change"];
const isOtpType = (value: string | null): value is EmailOtpType => OTP_TYPES.some((type) => type === value);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const cookieStore = await cookies();
  // ?next= first, then the cookie the sign-in form left, then /onboarding. Always through safeNext().
  const next = safeNext(searchParams.get("next") ?? cookieStore.get(NEXT_COOKIE)?.value);

  if (tokenHash && isOtpType(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      cookieStore.set(NEXT_COOKIE, "", { path: NEXT_COOKIE_PATH, maxAge: 0 });
      // Not a member of the workspace in `next` (a different person than last time): /onboarding instead of a 404.
      // The check can fail (network), and the link is already used up, so a failure must still land somewhere sensible.
      // (redirect() works by throwing, so it stays outside the try block.)
      let landing = DEFAULT_NEXT;
      try {
        landing = await landingAfterSignIn(supabase, next);
      } catch {
        console.warn("[auth] could not check the workspace after sign-in");
      }
      redirect(landing);
    }
    console.warn(`[auth] email link rejected: code=${error.code ?? "unknown"}`);
  }

  redirect("/login?error=link_invalid");
}
