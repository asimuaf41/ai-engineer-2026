import { AnimatedNumber } from "@repo/ui/motion/animated-number";
import { Sparkline } from "@repo/ui/motion/sparkline";
import { Stagger, StaggerItem } from "@repo/ui/motion/stagger";
import { Card, CardContent } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";
import { getKpis } from "@/lib/dashboard/data";

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4";

export async function KpiCards() {
  const kpis = await getKpis();

  return (
    <Stagger className={GRID}>
      {kpis.map((kpi) => {
        const good = kpi.trend === "good";
        const rising = (kpi.history.at(-1) ?? 0) >= (kpi.history[0] ?? 0);
        const Arrow = rising ? ArrowUpRightIcon : ArrowDownRightIcon;
        return (
          <StaggerItem key={kpi.id}>
            <Card className="h-full">
              <CardContent className="flex flex-col gap-2">
                <p className="h-5 text-sm text-muted-foreground">{kpi.label}</p>
                <p className="flex h-9 items-baseline gap-0.5 text-3xl font-semibold">
                  {kpi.prefix}
                  <AnimatedNumber value={kpi.value} />
                  {kpi.suffix && <span className="text-base font-normal text-muted-foreground">{kpi.suffix}</span>}
                </p>
                {/* The delta says it in words ("3 fewer than last week"), not by color alone. */}
                <p className={cn("flex h-5 items-center gap-1 text-sm", good ? "text-success" : "text-critical")}>
                  <Arrow aria-hidden className="size-4" />
                  {kpi.delta}
                </p>
                <Sparkline values={kpi.history} color={good ? "var(--success)" : "var(--critical)"} />
              </CardContent>
            </Card>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

export function KpiCardsSkeleton() {
  return (
    <div aria-busy="true" className={GRID}>
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index}>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
