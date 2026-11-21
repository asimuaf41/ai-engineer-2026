// Supabase client for Server Components, Server Actions and Route Handlers. It reads and writes the sign-in cookies.
// Create a NEW one inside every function that needs it. Never keep it in a global: each request has its own cookies.
import "server-only";
import type { Database } from "@repo/db";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/env.client";

export async function createClient() {
  const config = getSupabasePublicConfig();
  if (!config) throw new Error("Supabase is not configured. See apps/shipwright/.env.example.");
  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies can't be written. That is fine: the proxy
          // refreshes the session on every request and writes the cookies there.
        }
      },
    },
  });
}
