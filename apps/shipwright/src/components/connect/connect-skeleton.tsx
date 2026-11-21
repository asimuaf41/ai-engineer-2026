import { Skeleton } from "@repo/ui/components/skeleton";

// A grey outline of the page while it loads: the heading, then three step cards. (loading.tsx uses it.)
export function ConnectSkeleton() {
  return (
    <div role="status" aria-busy="true" className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <span className="sr-only">Loading your connections…</span>
      <div aria-hidden className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-3/4 max-w-md" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      <div aria-hidden className="flex flex-col gap-4">
        {[0, 1, 2].map((step) => (
          <div key={step} className="rounded-2xl border bg-card p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-5 w-48" />
            </div>
            {step === 0 ? (
              <div className="mt-4 flex flex-col gap-3 sm:pl-11">
                <Skeleton className="h-4 w-full max-w-md" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-11 w-40 rounded-lg" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
