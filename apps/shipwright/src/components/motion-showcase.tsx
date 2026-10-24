"use client";

// MotionShowcase: live demos of the motion building blocks, shown on the design page.
import { Button } from "@repo/ui/components/button";
import { AnimatedNumber } from "@repo/ui/motion/animated-number";
import { Reveal } from "@repo/ui/motion/reveal";
import { SegmentedControl } from "@repo/ui/motion/segmented-control";
import { Stagger, StaggerItem } from "@repo/ui/motion/stagger";
import { RotateCcwIcon } from "lucide-react";
import { useState } from "react";

type Range = "24h" | "7d" | "30d";

const RANGES: readonly { value: Range; label: string }[] = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

const FILES_SCANNED: Record<Range, number> = { "24h": 1204, "7d": 8391, "30d": 35210 };

const STEPS = ["Find", "Prove", "Fix", "Guard"];

const BOX = "rounded-xl border bg-card p-5";

export function MotionShowcase() {
  const [range, setRange] = useState<Range>("24h");
  const [replay, setReplay] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SegmentedControl aria-label="Time range" options={RANGES} value={range} onValueChange={setRange} />
        <p className="flex items-baseline gap-2">
          <AnimatedNumber value={FILES_SCANNED[range]} className="text-h2 font-semibold" />
          <span className="text-sm text-muted-foreground">files scanned</span>
        </p>
      </div>

      {/* Changing the key remounts the demos, so they play again from the start. */}
      <div key={replay} className="flex flex-col gap-4">
        <Reveal className={BOX}>Reveal: fades up the first time it scrolls into view.</Reveal>
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STEPS.map((step) => (
            <StaggerItem key={step} className={BOX}>
              {step}
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      <div>
        <Button variant="outline" size="sm" onClick={() => setReplay((count) => count + 1)}>
          <RotateCcwIcon />
          Replay
        </Button>
      </div>
    </div>
  );
}
