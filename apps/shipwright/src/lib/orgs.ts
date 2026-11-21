// Reading workspaces (organizations) and the signed-in person's role in each. Server only.
// Everything here asks the database AS THE SIGNED-IN USER (never the admin key), so the database rules (RLS) decide what
// the person may see. If they are not a member, the database returns nothing, and we answer 404: the page looks the same as
// one that doesn't exist, so nobody can find out that a workspace exists by guessing its address.
import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { SLUG_PATTERN } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

export type OrgRole = "owner" | "admin" | "member";
export type Org = { id: string; name: string; slug: string };
export type MyOrg = Org & { role: OrgRole };

// Who may manage connections and apps.
export const ADMIN_ROLES = ["owner", "admin"] as const satisfies readonly OrgRole[];

const isRole = (value: string): value is OrgRole => value === "owner" || value === "admin" || value === "member";

// One value or a one-item list: PostgREST describes "the org of this membership" as one object, but be safe.
const one = <T>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? (value[0] ?? null) : (value ?? null));

// Shared by everything in one request (React cache), so a layout, a page and the page title ask only once.
const currentUser = cache(async () => requireUser());

// The workspaces I belong to, oldest membership first (so "my first workspace" is predictable).
export const listMyOrgs = cache(async (): Promise<MyOrg[]> => {
  const user = await currentUser();
  const supabase = await createClient();
  // The policy lets me see EVERY member of my workspaces, so I filter to my own memberships.
  const { data, error } = await supabase
    .from("org_members")
    .select("role, created_at, orgs(id, name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn(`[orgs] could not list workspaces: code=${error.code}`);
    // Only the short database code (never data). Next shows this message in development and hides it in production.
    throw new Error(`Could not load your workspaces (database code ${error.code ?? "unknown"}).`);
  }

  const orgs: MyOrg[] = [];
  for (const row of data ?? []) {
    const org = one(row.orgs);
    if (org && isRole(row.role)) orgs.push({ id: org.id, name: org.name, slug: org.slug, role: row.role });
  }
  return orgs;
});

// The workspace with this address and my role in it, or null. One query, shared per request.
const loadOrg = cache(async (slug: string): Promise<{ org: Org; role: OrgRole; userId: string } | null> => {
  const user = await currentUser();
  const supabase = await createClient();
  // !inner: only memberships whose org has this slug. RLS has already hidden every workspace I'm not in.
  const { data, error } = await supabase
    .from("org_members")
    .select("role, orgs!inner(id, name, slug)")
    .eq("user_id", user.id)
    .eq("orgs.slug", slug)
    .maybeSingle();
  if (error) {
    console.warn(`[orgs] could not load a workspace: code=${error.code}`);
    throw new Error(`Could not load this workspace (database code ${error.code ?? "unknown"}).`);
  }
  const org = one(data?.orgs);
  if (!data || !org || !isRole(data.role)) return null;
  return { org: { id: org.id, name: org.name, slug: org.slug }, role: data.role, userId: user.id };
});

// For pages, layouts and actions of one workspace. Not a member, or not one of the allowed roles: a plain 404.
export async function requireOrg(slug: string, roles?: readonly OrgRole[]): Promise<{ org: Org; role: OrgRole; userId: string }> {
  // An address that could never be a workspace costs no database call.
  if (!SLUG_PATTERN.test(slug)) notFound();
  const found = await loadOrg(slug);
  if (!found || (roles && !roles.includes(found.role))) notFound();
  return found;
}
