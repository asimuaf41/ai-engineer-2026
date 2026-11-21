"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env.client";
import { createClient } from "@/lib/supabase/server";

// Signs the user out (ends the session at Supabase and clears the cookies), then goes to the home page.
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) console.warn(`[auth] sign-out failed: code=${error.code ?? "unknown"}`);
  }
  redirect("/");
}
