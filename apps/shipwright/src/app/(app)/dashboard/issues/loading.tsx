import { IssuesTableSkeleton } from "@/components/dashboard/issues-table-skeleton";
import { PageHeader } from "@/components/dashboard/page-header";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Issues" description="Every finding across your connected repos, worst first." />
      <IssuesTableSkeleton />
    </div>
  );
}
