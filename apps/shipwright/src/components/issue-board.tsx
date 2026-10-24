"use client";

import { duration, ease } from "@repo/ui/lib/motion";
import { AnimatedNumber } from "@repo/ui/motion/animated-number";
import { SegmentedControl } from "@repo/ui/motion/segmented-control";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { IssueCard, type Issue } from "@/components/issue-card";
import { productionScore } from "@/lib/sample-issues";

type Filter = "open" | "fixed" | "all";

const EMPTY_MESSAGE: Record<Exclude<Filter, "all">, string> = {
  open: "Nothing open. This app is ready for production.",
  fixed: "No fixed issues yet.",
};

// Cards pop in and out with the same small scale + fade, so the list feels like one surface.
const CARD_MOTION = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96, transition: { duration: duration.fast, ease: ease.in } },
};

export function IssueBoard({ initialIssues }: { initialIssues: Issue[] }) {
  const [issues, setIssues] = useState(initialIssues);
  const [filter, setFilter] = useState<Filter>("open");
  const [lastFixedTitle, setLastFixedTitle] = useState<string | null>(null);

  const score = productionScore(issues);
  // Built from current state, so the spoken score always matches the number on screen.
  const announcement = lastFixedTitle ? `Fixed: ${lastFixedTitle}. Production score is now ${score}.` : "";
  const openCount = issues.filter((issue) => issue.status === "open").length;
  const fixedCount = issues.length - openCount;
  const visible = filter === "all" ? issues : issues.filter((issue) => issue.status === filter);

  const options: readonly { value: Filter; label: string; count: number }[] = [
    { value: "open", label: "Open", count: openCount },
    { value: "fixed", label: "Fixed", count: fixedCount },
    { value: "all", label: "All", count: issues.length },
  ];

  // Functional update: an exiting card keeps its old props for a moment, so a click on it must
  // build on the latest list, never on the list from the render that created this handler.
  function mergeFix(issue: Issue) {
    setIssues((current) => current.map((item) => (item.id === issue.id ? { ...item, status: "fixed" as const } : item)));
    setLastFixedTitle(issue.title);
  }

  return (
    <section aria-labelledby="report-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="report-title" className="text-sm text-muted-foreground">
            Production score
          </h2>
          <p className="text-display font-semibold">
            <AnimatedNumber value={score} />
            <span className="text-h2 text-muted-foreground">/100</span>
          </p>
        </div>
        <SegmentedControl aria-label="Filter issues" options={options} value={filter} onValueChange={setFilter} />
      </div>

      {/* aria-live is for screen readers: the card disappears, so this says what changed. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* The ul is relative because popLayout takes an exiting card out of the flow (position: absolute)
          so the remaining cards can slide into its place right away. It needs this parent to anchor to. */}
      <ul className="relative mt-8 grid gap-4 lg:grid-cols-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((issue) => (
            <motion.li key={issue.id} layout="position" {...CARD_MOTION}>
              <IssueCard issue={issue} onFix={() => mergeFix(issue)} />
            </motion.li>
          ))}
          {visible.length === 0 && filter !== "all" && (
            <motion.li
              key="empty"
              layout="position"
              role="status"
              {...CARD_MOTION}
              className="w-full rounded-xl border border-dashed p-10 text-center text-muted-foreground lg:col-span-2"
            >
              {EMPTY_MESSAGE[filter]}
            </motion.li>
          )}
        </AnimatePresence>
      </ul>
    </section>
  );
}
