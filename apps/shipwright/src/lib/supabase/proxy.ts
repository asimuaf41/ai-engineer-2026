// Runs on (almost) every request, through src/proxy.ts. Two jobs:
// 1. Keep the sign-in session fresh: Supabase tokens expire, and only here can we write the renewed cookies.
// 2. Send signed-out visitors to /login, but ONLY for the private areas (/onboarding and /o/*). Public pages never redirect.
import type { Database } from "@repo/db";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/env.client";
import { safeNext } from "@/lib/safe-next";

const PRIVATE = /^\/(?:onboarding|o)(?:\/|$)/;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Supabase isn't set up (CI, a fresh deploy): let everything through instead of crashing public pages.
  const config = getSupabasePublicConfig();
  if (!config) return supabaseResponse;

  const supabase = createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) supabaseResponse.cookies.set(name, value, options);
      },
    },
  });

  // IMPORTANT: nothing between createServerClient and getClaims(). A small mistake here makes users get signed out at random.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && PRIVATE.test(request.nextUrl.pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(safeNext(request.nextUrl.pathname + request.nextUrl.search))}`;
    const redirect = NextResponse.redirect(login);
    // Keep any cookies the refresh just wrote (for example one that cleared a broken session).
    for (const cookie of supabaseResponse.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  // IMPORTANT: return THIS response, with its cookies. A new response without them would end the session early.
  return supabaseResponse;
}
