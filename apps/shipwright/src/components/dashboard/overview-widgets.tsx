import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { CircleAlertIcon, CircleCheckIcon, ScanSearchIcon } from "lucide-react";
import type { ReactNode } from "react";
import { getActivity, getOpenByCategory, getScoreHistory } from "@/lib/dashboard/data";
import type { Simulate } from "@/lib/dashboard/data";
import type { Activity } from "@/lib/dashboard/types";
import { CategoryChart } from "./category-chart";
import { ScoreTrendChart } from "./score-trend-chart";

function WidgetCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function WidgetSkeleton({ bodyClassName = "h-64" }: { bodyClassName?: string }) {
  return (
    <Card aria-busy="true" className="h-full">
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className={cn("w-full", bodyClassName)} />
      </CardContent>
    </Card>
  );
}

export async function ScoreTrendCard({ simulate }: { simulate?: Simulate }) {
  const data = await getScoreHistory(simulate);
  return (
    <WidgetCard title="Production score" description="Last 30 days">
      <ScoreTrendChart data={data} />
    </WidgetCard>
  );
}

export async function CategoryCard() {
  const data = await getOpenByCategory();
  return (
    <WidgetCard title="Open issues by area" description="Where the risk is">
      <CategoryChart data={data} />
    </WidgetCard>
  );
}

const ACTIVITY_ICON = {
  fixed: { icon: CircleCheckIcon, className: "text-success" },
  found: { icon: CircleAlertIcon, className: "text-critical" },
  scan: { icon: ScanSearchIcon, className: "text-muted-foreground" },
} satisfies Record<Activity["kind"], { icon: typeof CircleCheckIcon; className: string }>;

// A fixed timeZone keeps the server HTML and the browser's text identical.
function formatWhen(value: string) {
  return `${new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;
}

export async function ActivityCard() {
  const items = await getActivity();
  return (
    <WidgetCard title="Recent activity">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet. Run your first scan and results will show up here.</p>
      ) : (
        <ol className="flex flex-col divide-y">
          {items.map((item) => {
            const { icon: Icon, className } = ACTIVITY_ICON[item.kind];
            return (
              <li key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <Icon aria-hidden className={cn("size-4 shrink-0", className)} />
                <span className="min-w-0 flex-1 truncate">{item.text}</span>
                <time dateTime={item.when} className="shrink-0 text-xs text-muted-foreground">
                  {formatWhen(item.when)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </WidgetCard>
  );
}
