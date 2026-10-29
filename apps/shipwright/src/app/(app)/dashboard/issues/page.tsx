import type { Metadata } from "next";
import { IssuesTable } from "@/components/dashboard/issues-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { getIssues, parseSimulate } from "@/lib/dashboard/data";

export const metadata: Metadata = { title: "Issues" };

export default async function Page({ searchParams }: PageProps<"/dashboard/issues">) {
  const { simulate } = await searchParams;
  const issues = await getIssues(parseSimulate(simulate));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Issues" description="Every finding across your connected repos, worst first." />
      <IssuesTable initialIssues={issues} />
    </div>
  );
}
