// Shimmer: text with a bright band sweeping across it ("Thinking…", running tools).
// The sweep only runs when the user has not asked for reduced motion; otherwise it is plain muted text.
import type { ReactNode } from "react";
import { cn } from "#lib/utils";

export function Shimmer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "text-muted-foreground motion-safe:animate-shimmer motion-safe:bg-linear-to-r motion-safe:from-muted-foreground motion-safe:from-40% motion-safe:via-foreground motion-safe:to-muted-foreground motion-safe:to-60% motion-safe:bg-size-[200%_100%] motion-safe:bg-clip-text motion-safe:text-transparent",
        className,
      )}
    >
      {children}
    </span>
  );
}
