"use client";

// ScrollProgress: a thin bar at the top of the page that fills as you scroll down.
// Use it on long pages (articles, scroll stories). scrollYProgress is a MotionValue 0→1 that writes
// the transform straight to the DOM (no re-render); it follows the user's own scroll 1:1, so it stays on with reduced motion.
import { motion, useScroll } from "motion/react";
import { cn } from "#lib/utils";

export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      aria-hidden
      style={{ scaleX: scrollYProgress }}
      className={cn("fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-brand", className)}
    />
  );
}
