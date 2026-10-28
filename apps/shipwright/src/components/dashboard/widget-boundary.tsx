"use client";

// One widget fails alone: each dashboard widget sits in its own WidgetBoundary, so a broken query
// shows a small "Try again" card instead of taking the whole page down. catchError also lets
// redirect() and notFound() through, so those still work inside a widget.
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { TriangleAlertIcon } from "lucide-react";
import { catchError } from "next/error";
import type { ErrorInfo } from "next/error";

function WidgetError({ title, className }: { title: string; className?: string }, { retry }: ErrorInfo) {
  return (
    <div
      role="alert"
      className={cn(
        "flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center",
        className,
      )}
    >
      <TriangleAlertIcon aria-hidden className="size-6 text-high" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">Couldn’t load {title.toLowerCase()}</p>
        <p className="text-sm text-muted-foreground">The rest of the dashboard is fine. This usually fixes itself.</p>
      </div>
      <Button variant="outline" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}

export const WidgetBoundary = catchError(WidgetError);
