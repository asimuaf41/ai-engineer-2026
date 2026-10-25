"use client";

// Parallax: moves a block up or down at a different speed than the page while it scrolls past.
// Use it for decoration only (images, shapes, backgrounds), never for text.
// distance > 0 moves faster than the page (feels closer); < 0 moves slower (feels far away, for backgrounds).
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { ComponentProps } from "react";
import { useRef } from "react";

export function Parallax({
  distance = 40,
  ...props
}: Omit<ComponentProps<typeof motion.div>, "style"> & { distance?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    // "start end": progress starts at 0 when the element's top reaches the bottom of the screen.
    // "end start": progress reaches 1 when the element's bottom leaves the top of the screen.
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  // MotionConfig's reducedMotion doesn't cover style-bound motion values, so we check useReducedMotion ourselves.
  const reduceMotion = useReducedMotion();

  return <motion.div ref={ref} style={{ y: reduceMotion ? 0 : y }} {...props} />;
}
