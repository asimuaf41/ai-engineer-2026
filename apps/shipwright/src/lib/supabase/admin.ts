// Supabase client with the SECRET key. It bypasses Row Level Security, so it is for trusted server code only
// (writing findings, jobs, webhooks). Never call it from a page that returns user input unchecked, and never import it in a client component.
import "server-only";
import type { Database } from "@repo/db";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/env.client";
import { serverEnv } from "@/lib/env.server";

export function createAdminClient() {
  const config = getSupabasePublicConfig();
  if (!config || !serverEnv.SUPABASE_SECRET_KEY) {
    throw new Error("Supabase admin access is not configured. See apps/shipwright/.env.example.");
  }
  return createClient<Database>(config.url, serverEnv.SUPABASE_SECRET_KEY, {
    // There is no user and no browser here: don't keep a session or refresh tokens.
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
