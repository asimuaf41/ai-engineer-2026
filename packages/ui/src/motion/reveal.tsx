"use client";

// Reveal: fades and slides a block up the first time it scrolls into view.
// Use below the fold, not for the hero headline — starting at opacity 0 delays LCP.
import { motion } from "motion/react";
import type { ComponentProps } from "react";
import { enterTransition, fadeUp } from "#lib/motion";

export function Reveal({ delay = 0, ...props }: ComponentProps<typeof motion.div> & { delay?: number }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      transition={{ ...enterTransition, delay }}
      {...props}
    />
  );
}
