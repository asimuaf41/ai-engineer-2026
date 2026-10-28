import { Button } from "@repo/ui/components/button";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { KpiCards, KpiCardsSkeleton } from "@/components/dashboard/kpi-cards";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  ActivityCard,
  CategoryCard,
  ScoreTrendCard,
  WidgetSkeleton,
} from "@/components/dashboard/overview-widgets";
import { WidgetBoundary } from "@/components/dashboard/widget-boundary";
import { parseSimulate } from "@/lib/dashboard/data";
import { issuesUrl } from "@/lib/dashboard/search-params";

export const metadata: Metadata = { title: "Overview · Shipwright" };

export default async function Page({ searchParams }: PageProps<"/dashboard">) {
  const { simulate: rawSimulate } = await searchParams;
  const simulate = parseSimulate(rawSimulate);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="3 repos connected · last scan 2 hours ago"
        actions={
          <Button asChild>
            <Link href={issuesUrl({ severity: ["critical"] })}>Fix critical issues</Link>
          </Button>
        }
      />

      <WidgetBoundary title="Key metrics">
        <Suspense fallback={<KpiCardsSkeleton />}>
          <KpiCards />
        </Suspense>
      </WidgetBoundary>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <WidgetBoundary title="Production score">
            <Suspense fallback={<WidgetSkeleton />}>
              <ScoreTrendCard simulate={simulate} />
            </Suspense>
          </WidgetBoundary>
        </div>
        <div className="min-w-0 lg:col-span-2">
          <WidgetBoundary title="Open issues by area">
            <Suspense fallback={<WidgetSkeleton />}>
              <CategoryCard />
            </Suspense>
          </WidgetBoundary>
        </div>
      </div>

      <WidgetBoundary title="Recent activity">
        <Suspense fallback={<WidgetSkeleton bodyClassName="h-48" />}>
          <ActivityCard />
        </Suspense>
      </WidgetBoundary>
    </div>
  );
}
