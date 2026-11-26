"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// While an index is being built, ask the server for the page again every few seconds, so "Reading your code" turns into the
// result by itself. It stops after `stopAfterMs` (10 minutes) so a forgotten tab doesn't poll for ever, and then says so.
// Rendered only while the run is active, so it also stops on its own when the status changes.
export function AutoRefresh({ everyMs = 3000, stopAfterMs = 10 * 60 * 1000 }: { everyMs?: number; stopAfterMs?: number }) {
  const router = useRouter();
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      if (Date.now() - started >= stopAfterMs) {
        clearInterval(id);
        setStopped(true);
        return;
      }
      router.refresh();
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs, stopAfterMs]);

  return stopped ? <p className="text-sm text-muted-foreground">Still going? This page stopped updating by itself. Refresh it to check.</p> : null;
}
