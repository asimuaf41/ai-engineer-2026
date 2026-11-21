"use client";

// The tick that draws itself when a step is done (Motion's pathLength, using our shared duration and easing).
// Drawing a line is not a "transform or opacity" animation, so we switch it off ourselves when the person prefers reduced motion:
// the tick then jumps to its finished shape at once (duration 0). It always STARTS undrawn, so the server's HTML and the
// browser's first render agree (useReducedMotion() cannot know the preference on the server).
import { duration, ease } from "@repo/ui/lib/motion";
import { motion, useReducedMotion } from "motion/react";

export function AnimatedCheck() {
  const reduceMotion = useReducedMotion();
  return (
    // Hidden from screen readers: the step says "Completed" in words.
    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-background">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: duration.base, ease: ease.out, delay: 0.1 }}
        />
      </svg>
    </span>
  );
}
