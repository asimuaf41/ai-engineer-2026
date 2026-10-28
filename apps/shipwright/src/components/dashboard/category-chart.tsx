"use client";

import { ChartContainer } from "@repo/ui/components/chart";
import type { ChartConfig } from "@repo/ui/components/chart";
import { useReducedMotion } from "motion/react";
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import type { CategoryCount } from "@/lib/dashboard/types";

const config = { open: { label: "Open issues", color: "var(--chart-1)" } } satisfies ChartConfig;

export function CategoryChart({ data }: { data: CategoryCount[] }) {
  // Recharts animates itself, so MotionConfig's reducedMotion can't stop it. We check it here.
  const animate = !useReducedMotion();
  const summary = `Open issues by area: ${data.map((item) => `${item.label} ${item.open}`).join(", ")}.`;

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full" role="img" aria-label={summary}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={120} tickLine={false} axisLine={false} />
        <Bar dataKey="open" fill="var(--color-open)" radius={6} barSize={22} isAnimationActive={animate}>
          <LabelList dataKey="open" position="right" className="fill-foreground text-xs" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
