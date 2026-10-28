"use client";

import { Button } from "@repo/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { TriangleAlertIcon } from "lucide-react";
import { useEffect } from "react";

// The sidebar and top bar stay because the layout sits above this boundary: only the page body is replaced.
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : undefined;

  useEffect(() => {
    // Day 19 (observability) sends this to our error tracker instead.
    console.error(error);
  }, [error]);

  return (
    <Empty role="alert">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-critical/10 text-critical">
          <TriangleAlertIcon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>We couldn’t load this page</EmptyTitle>
        <EmptyDescription>Your data is safe. This is usually a short hiccup on our side.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => retry()}>Try again</Button>
        {digest && <p className="font-mono text-xs text-muted-foreground">Reference: {digest}</p>}
      </EmptyContent>
    </Empty>
  );
}
