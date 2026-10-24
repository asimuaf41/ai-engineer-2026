"use client";

// AnimatedNumber: counts up to a value the first time it scrolls into view (stats, totals).
// A MotionValue renders straight to the DOM, so there is no React re-render per frame.
// MotionConfig's reducedMotion doesn't cover useSpring, so we check useReducedMotion ourselves.
import { motion, useInView, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "#lib/utils";

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const spring = useSpring(0, { visualDuration: 0.8, bounce: 0 });
  const text = useTransform(spring, (v) => Math.round(v).toLocaleString("en-US"));
  const inView = useInView(ref, { once: true });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reducedMotion) spring.jump(value);
    else spring.set(value);
  }, [inView, reducedMotion, spring, value]);

  return (
    <motion.span ref={ref} className={cn("tabular-nums", className)}>
      {text}
    </motion.span>
  );
}
