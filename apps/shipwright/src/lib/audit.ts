// The audit log: a record of who did what to a workspace. Only the SERVER writes it (the browser has no permission to),
// so it uses the admin client. Writing it must never break what the person was doing, so a failure is logged (a code only)
// and swallowed. Never put tokens, emails or names in `metadata`: ids and short facts only.
import "server-only";
import type { Json } from "@repo/db";
import { createAdminClient } from "@/lib/supabase/admin";

export async function recordAudit(entry: { orgId: string; actorId: string | null; action: string; metadata?: Record<string, Json> }): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from("audit_log")
      .insert({ org_id: entry.orgId, actor_id: entry.actorId, action: entry.action, metadata: entry.metadata ?? {} });
    if (error) console.warn(`[audit] could not record ${entry.action}: code=${error.code}`);
  } catch {
    console.warn(`[audit] could not record ${entry.action}`);
  }
}
