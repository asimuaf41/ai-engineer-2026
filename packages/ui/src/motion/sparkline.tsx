"use client";

// Sparkline: a tiny line chart with a soft area fill that draws itself in when it scrolls into view.
// It is decorative (the number next to it carries the meaning), so the SVG is aria-hidden.
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { ease } from "#lib/motion";
import { cn } from "#lib/utils";

const WIDTH = 240;
const HEIGHT = 32;
const PADDING = 2;

type SparklineProps = {
  values: readonly number[];
  /** Any CSS color, normally a token like "var(--chart-1)". */
  color?: string;
  className?: string;
};

export function Sparkline({ values, color = "var(--chart-1)", className }: SparklineProps) {
  const gradientId = useId();
  const reducedMotion = useReducedMotion();

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1; // flat data: avoid dividing by zero
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * WIDTH;
    const y = PADDING + (1 - (value - min) / range) * (HEIGHT - PADDING * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M${points.join(" L")}`;
  const area = `${line} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={cn("h-8 w-full overflow-visible", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill={`url(#${gradientId})`}
        initial={reducedMotion ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
      />
      {/* No vector-effect="non-scaling-stroke" here: it breaks pathLength, so the draw-in would not work. */}
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reducedMotion ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: ease.out }}
      />
    </svg>
  );
}
