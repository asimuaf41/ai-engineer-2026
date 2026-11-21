"use server";

// Creates the person's first workspace. The insert is made AS THE SIGNED-IN USER (never the admin key), so the database
// rules do their job: the organization can only be created for the person themselves, and the database itself makes them
// its owner (a trigger). Server Actions are public endpoints, so everything is validated again here.
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { listMyOrgs } from "@/lib/orgs";
import { makeSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

export type CreateOrgState = { status: "idle" } | { status: "error"; message: string; name: string };

const NameInput = z.object({
  name: z.string().trim().min(1, "Give your workspace a name.").max(80, "Please keep the name to 80 characters or fewer."),
});

const FAILED = "We couldn't create your workspace. Please try again in a moment.";

export async function createOrg(_previous: CreateOrgState, formData: FormData): Promise<CreateOrgState> {
  const user = await requireUser();
  const typed = String(formData.get("name") ?? "");

  const parsed = NameInput.safeParse({ name: typed });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? FAILED, name: typed };
  const { name } = parsed.data;

  // Already has a workspace (a second click, or an old tab): go there instead of making another.
  const existing = (await listMyOrgs())[0];
  if (existing) redirect(`/o/${existing.slug}/connect`);

  const supabase = await createClient();
  let slug = makeSlug(name);
  let created = false;
  // Two tries: if the random ending is already taken (error 23505), pick a new one once.
  for (let attempt = 0; attempt < 2 && !created; attempt += 1) {
    // No .select() on purpose: the person only becomes a member AFTER this insert (the trigger), so asking the database
    // to read the new row back in the same statement is refused. We read it in a second query below.
    const { error } = await supabase.from("orgs").insert({ name, slug, created_by: user.id });
    if (!error) {
      created = true;
    } else if (error.code === "23505") {
      slug = makeSlug(name);
    } else {
      console.warn(`[orgs] create failed: code=${error.code}`);
      return { status: "error", message: FAILED, name: typed };
    }
  }
  if (!created) return { status: "error", message: "We couldn't find a free address for that name. Please try again.", name: typed };

  // The record of who created it (server-written). Never blocks the person.
  const { data: org } = await supabase.from("orgs").select("id").eq("slug", slug).maybeSingle();
  if (org) await recordAudit({ orgId: org.id, actorId: user.id, action: "org.created", metadata: { slug } });

  // redirect() works by throwing, so it stays outside any try block.
  redirect(`/o/${slug}/connect`);
}
