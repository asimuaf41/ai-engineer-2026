import { Skeleton } from "@repo/ui/components/skeleton";

// A grey outline of the Code page while it loads: the header, the search box, a row of chips. (loading.tsx and the preview use it.)
export function CodeIndexSkeleton() {
  return (
    <div role="status" aria-busy="true" className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <span className="sr-only">Loading your code index…</span>
      <div aria-hidden className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-3/4 max-w-md" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      <div aria-hidden className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-11 w-full" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-56 rounded-full" />
          <Skeleton className="h-9 w-48 rounded-full" />
        </div>
      </div>
      <div aria-hidden className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:p-6">
        <Skeleton className="h-6 w-48" />
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map((chip) => (
            <Skeleton key={chip} className="h-9 w-28 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
