"use client"; // MISTAKE: this directive makes the module part of the client bundle,
// so everything below — including the "secret" key — ships to the browser.

import { createClient } from "@supabase/supabase-js";

// MISTAKE: service-role key read from a NEXT_PUBLIC_ var (those are inlined into
// client JS by Next.js at build time) and given a hardcoded fallback. A service-role
// key bypasses Row Level Security entirely, so leaking it means anyone can read/write
// every row in every table.
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
  "fake-service-role-key.eyJhbGciOiJIUzI1NiJ9.not-a-real-secret";

// MISTAKE: a privileged (service-role) client is created here and used from
// client-exposed code, instead of a scoped anon client plus RLS policies.
const supabase = createClient(
  "https://xyzcompany.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY
);

// MISTAKE: no auth/session check before querying, no pagination (select("*") on an
// entire table), so this leaks every user's full profile to any caller, in one shot,
// and will fall over once the table is large.
export async function getAllUsers() {
  const { data, error } = await supabase.from("profiles").select("*");

  if (error) throw error;
  return data;
}
