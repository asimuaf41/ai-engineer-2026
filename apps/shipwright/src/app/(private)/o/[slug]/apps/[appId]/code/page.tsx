import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSearchParamsCache } from "nuqs/server";
import { z } from "zod";
import { CodeIndexView } from "@/components/code-index/code-index-view";
import { codeSearchParams } from "@/lib/code-index/code-search-params";
import { loadCodeIndexData } from "@/lib/code-index/load";
import { ADMIN_ROLES, requireOrg } from "@/lib/orgs";
import { createClient } from "@/lib/supabase/server";
import { startIndex } from "../actions";
import { searchAction } from "./actions";

export const metadata: Metadata = { title: "Code index" };
// Same limit as the Connect page, where "Index my code" is started (Re-index here runs on this page's limit).
export const maxDuration = 300;

const searchParamsCache = createSearchParamsCache(codeSearchParams);

// Read as the signed-in person: the database rules (RLS) decide what they may see. The code itself (code_chunks) is never read here.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; appId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug, appId } = await params;
  const { org, role } = await requireOrg(slug);
  if (!z.uuid().safeParse(appId).success) notFound();
  const { kind } = await searchParamsCache.parse(searchParams);

  const db = await createClient();
  const app = await db.from("apps").select("id, repo_full_name").eq("id", appId).eq("org_id", org.id).maybeSingle();
  if (app.error) throw new Error(`Could not read the app (code ${app.error.code}).`);
  if (!app.data) notFound();

  const data = await loadCodeIndexData({
    db,
    slug: org.slug,
    appId,
    repoFullName: app.data.repo_full_name,
    canManage: (ADMIN_ROLES as readonly string[]).includes(role),
    selectedKind: kind,
  });

  // Re-index is the same action as "Index my code": it checks the role and the app again on the server.
  return <CodeIndexView data={data} search={searchAction} reindex={startIndex.bind(null, org.slug, appId)} />;
}
