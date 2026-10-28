import { KpiCardsSkeleton } from "@/components/dashboard/kpi-cards";
import { WidgetSkeleton } from "@/components/dashboard/overview-widgets";
import { Skeleton } from "@repo/ui/components/skeleton";

// Same layout as page.tsx, so nothing jumps when the real page arrives.
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-64" />
      </div>
      <KpiCardsSkeleton />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <WidgetSkeleton />
        </div>
        <div className="min-w-0 lg:col-span-2">
          <WidgetSkeleton />
        </div>
      </div>
      <WidgetSkeleton bodyClassName="h-48" />
    </div>
  );
}
