"use client";

// HowItWorks: a scroll story. The steps scroll on the left; a sticky "screen" on the right swaps to the active step.
// A thin rail fills with scroll progress (a MotionValue, no re-render); only the step number lives in state.
import { duration, ease } from "@repo/ui/lib/motion";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { GitPullRequestIcon, RadarIcon, SearchCheckIcon, ShieldCheckIcon } from "lucide-react";
import type { ComponentType } from "react";
import { useRef, useState } from "react";
import { FindVisual, FixVisual, GuardVisual, ProveVisual } from "@/components/story-visuals";

type Step = {
  id: string;
  title: string;
  text: string;
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  Visual: ComponentType;
};

// A non-empty tuple, so STEPS[0] is always defined even with noUncheckedIndexedAccess.
const STEPS: [Step, ...Step[]] = [
  {
    id: "find",
    title: "Find",
    text: "Shipwright scans your app and lists every real security and reliability problem, in plain English.",
    Icon: SearchCheckIcon,
    Visual: FindVisual,
  },
  {
    id: "prove",
    title: "Prove",
    text: "Each problem is reproduced safely, so you see evidence instead of a guess.",
    Icon: ShieldCheckIcon,
    Visual: ProveVisual,
  },
  {
    id: "fix",
    title: "Fix",
    text: "We open a pull request with the fix and the tests. You review it and merge when you are happy.",
    Icon: GitPullRequestIcon,
    Visual: FixVisual,
  },
  {
    id: "guard",
    title: "Guard",
    text: "Every future push is checked, so the same problem can't quietly come back.",
    Icon: RadarIcon,
    Visual: GuardVisual,
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // 0 when the top of the steps reaches the middle of the screen, 1 when the bottom does.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"],
  });

  // This runs on every frame of scrolling, but React skips the re-render when the step did not change.
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.min(STEPS.length - 1, Math.floor(v * STEPS.length)));
  });

  const current = STEPS[active] ?? STEPS[0];
  const ActiveVisual = current.Visual;

  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-14 py-24">
      <p className="font-mono text-xs tracking-widest text-brand uppercase">How it works</p>
      <h2 id="how-title" className="mt-3 max-w-2xl text-h1 font-semibold">
        From “works in the demo” to production-ready in four steps
      </h2>

      {/* Grid items stretch, so the right column is as tall as the steps and sticky has room to move.
          Never add items-start here. grid-cols-1 (minmax(0,1fr)) keeps long code lines from widening the column on phones. */}
      <div ref={ref} className="relative mt-16 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        <div aria-hidden className="absolute inset-y-0 left-4.5 hidden w-px bg-border lg:block">
          <motion.div style={{ scaleY: scrollYProgress }} className="size-full origin-top bg-brand" />
        </div>

        <ol className="grid grid-cols-1 gap-12 lg:gap-0">
          {STEPS.map((step, i) => (
            <li
              key={step.id}
              data-active={i === active}
              // Inactive steps are dimmed with color, not opacity: faded text fails the WCAG contrast minimum.
              className="group/step lg:flex lg:min-h-[60vh] lg:items-center lg:pl-14"
            >
              <div className="lg:relative">
                {/* On desktop the tile sits on the progress rail. */}
                <div className="flex size-9 items-center justify-center rounded-lg border bg-muted transition-opacity duration-300 lg:absolute lg:-left-14 lg:top-0 lg:bg-background lg:group-data-[active=false]/step:opacity-50">
                  <step.Icon aria-hidden className="size-5 text-brand" />
                </div>
                <h3 className="mt-4 text-h2 font-semibold transition-colors duration-300 lg:mt-0 lg:pt-1 lg:group-data-[active=false]/step:text-muted-foreground">
                  <span className="mr-2 text-muted-foreground tabular-nums">0{i + 1}</span>
                  {step.title}
                </h3>
                <p className="mt-3 max-w-md text-lg text-muted-foreground transition-colors duration-300 lg:group-data-[active=true]/step:text-foreground">
                  {step.text}
                </p>
                <div aria-hidden className="mt-6 lg:hidden">
                  <step.Visual />
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div aria-hidden className="hidden lg:block">
          <div className="sticky top-[calc(50vh-10rem)] h-80">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12, transition: { duration: duration.fast, ease: ease.in } }}
                className="h-full"
              >
                <ActiveVisual />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
