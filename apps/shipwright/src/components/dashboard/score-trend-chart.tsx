"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@repo/ui/components/chart";
import type { ChartConfig } from "@repo/ui/components/chart";
import { useReducedMotion } from "motion/react";
import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import type { ScorePoint } from "@/lib/dashboard/types";

const config = { score: { label: "Score", color: "var(--chart-1)" } } satisfies ChartConfig;
const TARGET = 80;

// A fixed timeZone keeps the server HTML and the browser's text identical.
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function ScoreTrendChart({ data }: { data: ScorePoint[] }) {
  // Recharts animates itself, so MotionConfig's reducedMotion can't stop it. We check it here.
  const animate = !useReducedMotion();
  const gradientId = useId().replace(/:/g, "");
  const first = data[0]?.score;
  const last = data.at(-1)?.score;
  const summary = `Production score went from ${first} to ${last} over the last ${data.length} days. The launch-ready target is ${TARGET}.`;

  return (
    <figure>
      <ChartContainer config={config} className="aspect-auto h-64 w-full" role="img" aria-label={summary}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-score)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-score)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 80, 100]} width={32} tickLine={false} axisLine={false} />
          <ReferenceLine
            y={TARGET}
            stroke="var(--success)"
            strokeDasharray="4 4"
            label={{ value: "Launch-ready", position: "insideTopRight", fill: "var(--success)", fontSize: 12 }}
          />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatDate(String(value))} />} />
          <Area
            dataKey="score"
            type="monotone"
            stroke="var(--color-score)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={animate}
          />
        </AreaChart>
      </ChartContainer>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
