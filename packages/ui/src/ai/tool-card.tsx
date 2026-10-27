"use client";

// ToolCard: shows one tool call (running, done, error or stopped) with an animated status icon.
// The result (children) or error text slides open once the call finishes.
import { AnimatePresence, motion } from "motion/react";
import { CheckIcon, CircleSlashIcon, Loader2Icon, TriangleAlertIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { duration, ease, spring } from "#lib/motion";
import { cn } from "#lib/utils";
import { Shimmer } from "#ai/shimmer";

export type ToolStatus = "running" | "done" | "error" | "stopped";

const STATUS_ICON = {
  running: <Loader2Icon className="size-4 text-muted-foreground motion-safe:animate-spin" aria-hidden />,
  done: <CheckIcon className="size-4 text-success" aria-hidden />,
  error: <TriangleAlertIcon className="size-4 text-critical" aria-hidden />,
  stopped: <CircleSlashIcon className="size-4 text-muted-foreground" aria-hidden />,
} satisfies Record<ToolStatus, ReactNode>;

type ToolCardProps = {
  status: ToolStatus;
  title: string;
  icon: LucideIcon;
  detail?: string;
  errorText?: string;
  children?: ReactNode;
  className?: string;
};

export function ToolCard({ status, title, icon: Icon, detail, errorText, children, className }: ToolCardProps) {
  const showBody = (status === "done" && children) || (status === "error" && errorText);

  return (
    <div
      data-status={status}
      className={cn("w-full overflow-hidden rounded-lg border bg-card text-sm data-[status=error]:border-critical/40", className)}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon className="size-4 shrink-0 text-brand" aria-hidden />
        <span aria-live="polite" className="font-medium">
          {status === "running" ? <Shimmer>{title}…</Shimmer> : title}
        </span>
        {detail && <span className="truncate font-mono text-xs text-muted-foreground">{detail}</span>}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={status}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={spring.snappy}
            className="ml-auto"
          >
            {STATUS_ICON[status]}
          </motion.span>
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {showBody && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: duration.base, ease: ease.out }}
            className="overflow-hidden"
          >
            <div className="border-t px-3 py-3">
              {status === "error" ? <p className="text-critical">{errorText}</p> : children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
