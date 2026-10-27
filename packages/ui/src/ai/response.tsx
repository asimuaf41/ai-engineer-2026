"use client";

// Response: renders model text as markdown. Streamdown closes half-finished markdown on every
// chunk and sanitizes HTML (model output is untrusted), so this is the ONLY way to show it.
import { useReducedMotion } from "motion/react";
import { Streamdown } from "streamdown";
import { cn } from "#lib/utils";

export function Response({ children, isStreaming, className }: { children: string; isStreaming: boolean; className?: string }) {
  // Streamdown's CSS has no reduced-motion rule, so we switch its animation off here.
  const animated = !useReducedMotion();

  return (
    <Streamdown
      isAnimating={isStreaming}
      caret={isStreaming ? "block" : undefined}
      animated={animated}
      className={cn("w-full text-[0.9375rem] leading-7 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
    >
      {children}
    </Streamdown>
  );
}
