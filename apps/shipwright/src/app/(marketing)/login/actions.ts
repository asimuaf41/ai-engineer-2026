"use server";

// Sends the sign-in email. Server Actions are public endpoints (anyone can call them with anything), so we validate.
// We never log the email, tokens or Supabase's answer. Only a short error code.
import { cookies } from "next/headers";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env.client";
import { NEXT_COOKIE, NEXT_COOKIE_PATH, safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export type SignInState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string; email: string };

const EmailInput = z.object({ email: z.email().max(254) });

const MESSAGES = {
  invalid: "That email address doesn't look right. Check it and try again.",
  tooMany: "You asked for a link a moment ago. Please wait a minute, then try again.",
  failed: "We couldn't send the link. Please try again in a moment.",
  notSetUp: "Sign-in isn't set up on this server yet.",
} as const;

export async function signInWithEmail(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const typed = String(formData.get("email") ?? "").trim();
  const parsed = EmailInput.safeParse({ email: typed.toLowerCase() });
  if (!parsed.success) return { status: "error", message: MESSAGES.invalid, email: typed };
  const email = parsed.data.email;

  if (!isSupabaseConfigured()) return { status: "error", message: MESSAGES.notSetUp, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });

  if (error) {
    console.warn(`[auth] sign-in link failed: code=${error.code ?? "unknown"} status=${error.status ?? "unknown"}`);
    const tooMany = error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit";
    const invalid = error.code === "email_address_invalid" || error.code === "validation_failed";
    return { status: "error", message: tooMany ? MESSAGES.tooMany : invalid ? MESSAGES.invalid : MESSAGES.failed, email };
  }

  // Remember where to go after the link is clicked. safeNext() keeps it a path on this site.
  const cookieStore = await cookies();
  cookieStore.set(NEXT_COOKIE, safeNext(String(formData.get("next") ?? "")), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: NEXT_COOKIE_PATH,
  });

  return { status: "sent", email };
}
