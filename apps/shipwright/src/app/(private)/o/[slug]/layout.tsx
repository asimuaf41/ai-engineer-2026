import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OrgTopBar } from "@/components/org/org-top-bar";
import { listMyOrgs, requireOrg } from "@/lib/orgs";

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

  return (
    <>
      <OrgTopBar org={org} role={role} orgs={orgs} />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <div className="container-page py-8 sm:py-12">{children}</div>
      </main>
    </>
  );
}
