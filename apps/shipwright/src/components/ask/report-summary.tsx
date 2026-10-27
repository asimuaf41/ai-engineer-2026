// Sidebar card on the Ask page: the repo's production score and open issues.
// The skeleton uses the same boxes at the same heights, so nothing jumps when data arrives.
import { Badge } from "@repo/ui/components/badge";
import { Skeleton } from "@repo/ui/components/skeleton";
import { AnimatedNumber } from "@repo/ui/motion/animated-number";
import { getReportSummary } from "@/lib/ask/report";

export async function ReportSummary() {
  const report = await getReportSummary();

  return (
    <section aria-label="Report summary" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <p className="h-4 truncate font-mono text-xs leading-4 text-muted-foreground">{report.repo}</p>
      <p className="h-5 text-sm leading-5 font-medium">Production score</p>
      <p className="flex h-12 items-baseline gap-1">
        <AnimatedNumber value={report.score} className="text-h1 leading-12 font-semibold" />
        <span className="text-muted-foreground">/100</span>
      </p>
      <p className="h-4 text-xs leading-4 text-muted-foreground">Last scan {report.scannedAgo}</p>
      <ul className="grid grid-cols-1 gap-2 border-t pt-4">
        {report.openIssues.map((issue) => (
          <li key={issue.id} className="flex h-6 items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">{issue.title}</span>
            <Badge variant={issue.severity} className="capitalize">
              {issue.severity}
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReportSummarySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading report" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-12 w-24" />
      <Skeleton className="h-4 w-36" />
      <div className="grid grid-cols-1 gap-2 border-t pt-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}
