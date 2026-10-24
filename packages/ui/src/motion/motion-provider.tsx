"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { spring } from "#lib/motion";

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    // reducedMotion="user" follows the OS "reduce motion" setting: when it is on, movement
    // (x, y, scale, layout) is skipped, while opacity and color changes still animate.
    <MotionConfig reducedMotion="user" transition={spring.smooth}>
      {children}
    </MotionConfig>
  );
}
