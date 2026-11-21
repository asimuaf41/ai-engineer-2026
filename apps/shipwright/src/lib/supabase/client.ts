// Supabase client for code that runs in the BROWSER. It only has the publishable key, so Row Level Security protects the data.
// Callers check isSupabaseConfigured() first: with no Supabase settings this throws.
import type { Database } from "@repo/db";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/env.client";

export function createClient() {
  const config = getSupabasePublicConfig();
  if (!config) throw new Error("Supabase is not configured. See apps/shipwright/.env.example.");
  return createBrowserClient<Database>(config.url, config.publishableKey);
}
