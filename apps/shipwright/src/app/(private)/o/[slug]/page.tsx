import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/orgs";

// /o/<slug> has nothing of its own yet: the first thing to do in a workspace is connect an app.
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { org } = await requireOrg(slug);
  redirect(`/o/${org.slug}/connect`);
}
