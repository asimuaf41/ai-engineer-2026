import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreateOrgForm } from "@/components/org/create-org-form";
import { PrivateHeader } from "@/components/org/private-header";
import { isConnectErrorCode } from "@/lib/connect/errors";
import { listMyOrgs } from "@/lib/orgs";

export const metadata: Metadata = { title: "Create your workspace" };

// Right after sign-in. Someone who already has a workspace is sent straight to it; a new person creates their first one.
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const { error } = await searchParams;
  const first = (await listMyOrgs())[0];
  if (first) {
    // A connect step that failed before we knew the workspace sends its error code here. Keep it, but only if it is one of ours.
    const code = Array.isArray(error) ? error[0] : error;
    redirect(`/o/${first.slug}/connect${isConnectErrorCode(code) ? `?error=${code}` : ""}`);
  }

  return (
    <>
      <PrivateHeader />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <div className="container-page flex justify-center py-16 sm:py-24">
          <CreateOrgForm />
        </div>
      </main>
    </>
  );
}
