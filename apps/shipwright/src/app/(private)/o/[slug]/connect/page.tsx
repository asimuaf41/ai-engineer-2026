import type { Metadata } from "next";
import { ConnectView } from "@/components/connect/connect-view";
import { loadConnectInput } from "@/lib/connect/load";
import { requireOrg } from "@/lib/orgs";
import { chooseProjectAction, chooseRepoAction, disconnectAction } from "./actions";

export const metadata: Metadata = { title: "Connect your app" };

type SearchParams = { error?: string | string[]; status?: string | string[]; step?: string | string[] };
const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

// The three-step "Connect your app" page. It reads the workspace, my role, the connections and the app as ME (the database rules
// decide what I may see), and draws the state. All the choices are checked again on the server when a button is pressed.
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  const { slug } = await params;
  const query = await searchParams;
  const { org, role } = await requireOrg(slug);

  const input = await loadConnectInput({ orgId: org.id, role, status: first(query.status), step: first(query.step) });

  return (
    <ConnectView
      slug={org.slug}
      input={input}
      errorValue={query.error}
      actions={{ chooseRepo: chooseRepoAction, chooseProject: chooseProjectAction, disconnect: disconnectAction }}
    />
  );
}
