"use client";

// One card of the vertical stepper. The open step shows its full content; the others show a one-line summary.
// When the open step changes, the card grows or shrinks with Motion's `layout` (and the MotionProvider already
// switches layout animation off for people who prefer reduced motion, so the same states appear without movement).
import { spring } from "@repo/ui/lib/motion";
import { cn } from "@repo/ui/lib/utils";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { StepState } from "@/lib/connect/state";
import { AnimatedCheck } from "./animated-check";

const STATE_WORDS: Record<StepState, string> = {
  done: "Completed",
  active: "Current step",
  upcoming: "Up next",
  skipped: "Skipped",
};

export function StepShell({
  number,
  title,
  state,
  tag,
  summary,
  children,
}: {
  number: number;
  title: string;
  state: StepState;
  // A small label next to the title, such as "Optional".
  tag?: ReactNode;
  // Shown when the step is NOT the open one (done, skipped, or waiting).
  summary?: ReactNode;
  // Shown only while the step is open.
  children?: ReactNode;
}) {
  const open = state === "active";
  return (
    <motion.li
      layout
      transition={spring.smooth}
      aria-current={open ? "step" : undefined}
      className={cn(
        "rounded-2xl border bg-card p-4 sm:p-6",
        open && "border-brand ring-1 ring-brand",
        state === "upcoming" && "bg-muted/30",
      )}
    >
      <div className="flex items-start gap-3">
        {state === "done" ? (
          <AnimatedCheck />
        ) : (
          <span
            aria-hidden
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
              open ? "border-brand bg-brand text-brand-foreground" : "text-muted-foreground",
            )}
          >
            {number}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="text-h3 font-semibold">{title}</h2>
            {tag}
          </div>
          <p className="sr-only">{STATE_WORDS[state]}</p>
          {!open && summary ? <div className="mt-1 text-sm text-muted-foreground">{summary}</div> : null}
        </div>
      </div>
      {open ? <div className="mt-4 flex flex-col gap-4 sm:pl-11">{children}</div> : null}
    </motion.li>
  );
}
