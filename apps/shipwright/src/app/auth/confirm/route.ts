// The sign-in email's button lands here: /auth/confirm?token_hash=...&type=email
// We swap the one-time token for a session (cookies), then send the person on. Never log the token.
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { NEXT_COOKIE, NEXT_COOKIE_PATH, safeNext } from "@/lib/safe-next";
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
      redirect(next);
    }
    console.warn(`[auth] email link rejected: code=${error.code ?? "unknown"}`);
  }

  redirect("/login?error=link_invalid");
}
