"use client";

// HeroShot: a fake browser window showing a Shipwright report, used as the landing-page product shot.
// It starts tilted back and flattens as you scroll it into view (scroll-linked, not time-based).
// The headline is NOT in here: it stays server-rendered and visible at once, so LCP is not delayed.
import { Badge } from "@repo/ui/components/badge";
import { enterTransition, fadeUp } from "@repo/ui/lib/motion";
import { AnimatedNumber } from "@repo/ui/motion/animated-number";
import { Parallax } from "@repo/ui/motion/parallax";
import { motion, stagger, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { Variants } from "motion/react";
import { useRef } from "react";
import type { Severity } from "@/components/issue-card";
import { productionScore, SAMPLE_ISSUES } from "@/lib/sample-issues";

const OPEN = SAMPLE_ISSUES.filter((issue) => issue.status === "open");
const score = productionScore(SAMPLE_ISSUES);

const SEVERITY_LABEL = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
} as const satisfies Record<Severity, string>;

// The rows wait 0.3s for the window to settle, then appear one after another.
const rows = {
  hidden: {},
  visible: { transition: { delayChildren: stagger(0.08, { startDelay: 0.3 }) } },
} satisfies Variants;

export function HeroShot() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({
    target: ref,
    // "start end": the top of the shot touches the bottom of the screen. "start 0.2": its top has reached
    // 20% down from the top of the screen. So p is 0 when the shot first peeks in and 1 once it is in place.
    offset: ["start end", "start 0.2"],
  });
  const rotateX = useTransform(p, [0, 1], [18, 0]);
  const scale = useTransform(p, [0, 1], [0.94, 1]);
  const reduceMotion = useReducedMotion();

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-5xl perspective-[1200px]">
      {/* The glow moves slower than the page, so it feels far away. */}
      <Parallax distance={-60} aria-hidden className="absolute inset-x-[10%] -top-16 bottom-0 -z-10">
        <div className="size-full rounded-full bg-brand/25 blur-3xl" />
      </Parallax>

      <motion.div
        style={reduceMotion ? undefined : { rotateX, scale }}
        initial={{ y: 24 }}
        animate={{ y: 0 }}
        transition={enterTransition}
        className="origin-top overflow-hidden rounded-xl border bg-card shadow-2xl shadow-brand/10"
      >
        <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2.5">
          <span aria-hidden className="size-2.5 rounded-full bg-foreground/15" />
          <span aria-hidden className="size-2.5 rounded-full bg-foreground/15" />
          <span aria-hidden className="size-2.5 rounded-full bg-foreground/15" />
          <div className="mx-auto truncate rounded-md bg-background px-3 py-0.5 font-mono text-xs text-muted-foreground">
            shipwright.dev/report/acme-checkout
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 md:grid-cols-[13rem_1fr]">
          <div>
            <p className="text-sm text-muted-foreground">Production score</p>
            <p className="text-h1 font-semibold">
              <AnimatedNumber value={score} />
              <span className="text-h3 text-muted-foreground">/100</span>
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span aria-hidden className="relative flex size-2">
                <span className="absolute inset-0 rounded-full bg-success motion-safe:animate-ping" />
                <span className="relative size-2 rounded-full bg-success" />
              </span>
              Guarding acme/checkout-app
            </p>
          </div>

          <motion.ul variants={rows} initial="hidden" animate="visible" className="grid gap-2">
            {OPEN.map((issue) => (
              <motion.li
                key={issue.id}
                variants={fadeUp}
                transition={enterTransition}
                className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5"
              >
                <span className="min-w-0 truncate text-sm font-medium">{issue.title}</span>
                <Badge variant={issue.severity}>{SEVERITY_LABEL[issue.severity]}</Badge>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </motion.div>
    </div>
  );
}
