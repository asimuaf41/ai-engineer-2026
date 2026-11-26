import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OrgTopBar } from "@/components/org/org-top-bar";
import { listMyOrgs, requireOrg } from "@/lib/orgs";
import { createClient } from "@/lib/supabase/server";

type Props = { children: ReactNode; params: Promise<{ slug: string }> };

// The browser tab shows the workspace name. (requireOrg is shared per request, so this costs no extra query.)
export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  const { org } = await requireOrg(slug);
  return { title: org.name };
}

// Every page of a workspace sits inside this: not a member means a 404 here, before any page code runs.
export default async function OrgLayout({ children, params }: Props) {
  const { slug } = await params;
  const { org, role } = await requireOrg(slug);
  const orgs = await listMyOrgs();

  // The apps of this workspace, for the "Code" link. Read as me (RLS). If it fails, the page still works, just without the link.
  const { data, error } = await (await createClient()).from("apps").select("id, repo_full_name").eq("org_id", org.id).order("repo_full_name");
  if (error) console.warn(`[org] could not list apps for the nav: code=${error.code}`);
  const apps = (data ?? []).map((app) => ({ id: app.id, repoFullName: app.repo_full_name }));

  return (
    <>
      <OrgTopBar org={org} role={role} orgs={orgs} apps={apps} />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <div className="container-page py-8 sm:py-12">{children}</div>
      </main>
    </>
  );
}
