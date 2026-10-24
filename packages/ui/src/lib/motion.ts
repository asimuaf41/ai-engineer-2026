/* This file is the ONE place durations, easings and springs live — like colors in globals.css.
   Components use these tokens — never raw numbers or curves.
   Keep the durations in sync with --duration-* in styles/transitions.css. */
import type { Transition, Variants } from "motion/react";

export const duration = { fast: 0.15, base: 0.25, slow: 0.4 } as const;

export const ease = {
  // Arriving: starts fast, settles gently. Use for things entering the screen.
  out: [0.16, 1, 0.3, 1],
  // Leaving: starts slow, speeds up. Use for things exiting the screen.
  in: [0.7, 0, 0.84, 0],
  // Moving from A to B: eases at both ends.
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const spring = {
  snappy: { type: "spring", visualDuration: 0.25, bounce: 0.15 },
  smooth: { type: "spring", visualDuration: 0.4, bounce: 0 },
} satisfies Record<string, Transition>;

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
} satisfies Variants;

export const enterTransition = { duration: duration.slow, ease: ease.out } satisfies Transition;
