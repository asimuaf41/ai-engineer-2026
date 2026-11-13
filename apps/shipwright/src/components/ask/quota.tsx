"use client";

// The daily free-question UI: a small pill with the questions left, and a friendly card (never a red
// error) when they run out. The quota comes from GET /api/quota and from the metadata of each answer.
import { formatResetIn } from "@repo/ai/shared";
import type { AskQuota } from "@repo/ai/shared";
import { AnimatedNumber } from "@repo/ui/motion/animated-number";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { ClockIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Reads the quota once on mount. If the request fails we simply show no pill: the chat still works,
// and the server enforces the limit either way.
export function useFetchedQuota(): AskQuota | undefined {
  const [quota, setQuota] = useState<AskQuota>();
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/quota", { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<AskQuota>) : undefined))
      .then(setQuota)
      .catch(() => undefined); // offline or aborted: no pill, see above
    return () => controller.abort();
  }, []);
  return quota;
}

export function QuotaPill({ quota }: { quota: AskQuota }) {
  // Green while plenty is left, amber at the last two, red at none.
  const variant = quota.remaining === 0 ? "critical" : quota.remaining <= 2 ? "medium" : "success";
  return (
    <Badge variant={variant} className="h-6 gap-1.5 px-3 text-xs" aria-label={`${quota.remaining} of ${quota.limit} free questions left today`}>
      <SparklesIcon aria-hidden />
      <span>
        <AnimatedNumber value={quota.remaining} /> of {quota.limit} free questions left today
      </span>
    </Badge>
  );
}

function useCountdown(resetAt: string | undefined): string | undefined {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return resetAt ? formatResetIn(resetAt, now) : undefined;
}

// Shown instead of the prompt box once the day's questions are used up.
export function LimitCard({ resetAt, limit }: { resetAt?: string; limit: number }) {
  const resetIn = useCountdown(resetAt);
  return (
    <section
      aria-labelledby="limit-title"
      className="flex flex-col items-start gap-4 rounded-2xl border border-brand/30 bg-linear-to-br from-brand/10 via-card to-card p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="limit-title" className="text-lg font-semibold">
          {`You've used today's ${limit} free questions`}
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Thanks for trying Shipwright! The demo is free but limited, so it stays fast for everyone.
        </p>
      </div>
      {resetIn ? (
        <p className="flex items-center gap-2 text-sm font-medium">
          <ClockIcon className="size-4 text-brand" aria-hidden />
          {`Your questions reset in ${resetIn}`}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/demo">See the full demo report</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Explore the dashboard</Link>
        </Button>
      </div>
    </section>
  );
}

// Shown when the whole demo's live budget for the day is used and answers are scripted instead.
export function BusyDayNote() {
  return (
    <p role="status" className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
      Lots of visitors today, so you&apos;re seeing a prepared demo answer.
    </p>
  );
}
