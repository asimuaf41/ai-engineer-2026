"use client";

// SegmentedControl: a pill-style single-choice toggle (filters, view switches).
// The white pill slides between options; use it when there are 2-5 short options.
import { motion } from "motion/react";
import { ToggleGroup } from "radix-ui";
import { useId } from "react";
import { cn } from "#lib/utils";
import { spring } from "#lib/motion";

type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string; count?: number }[];
  value: T;
  onValueChange: (value: T) => void;
  "aria-label": string;
  className?: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  "aria-label": ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  // layoutId is global, so the per-instance prefix stops two controls sharing one pill.
  const pillId = `${useId()}-pill`;

  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      // Radix sends "" when the active item is clicked again; ignore it so one option stays selected.
      // Radix types the value as string, and only our options can be sent, so narrowing to T is safe.
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      aria-label={ariaLabel}
      className={cn("inline-flex items-center gap-1 rounded-lg border bg-muted p-1", className)}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className="relative rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=on]:text-foreground"
        >
          {option.value === value && (
            <motion.span
              layoutId={pillId}
              transition={spring.snappy}
              aria-hidden
              className="absolute inset-0 rounded-md bg-background shadow-sm ring-1 ring-border"
            />
          )}
          <span className="relative">{option.label}</span>
          {option.count !== undefined && (
            <>
              {/* Adjacent spans have no space between them, so screen readers would say "Open6". */}
              <span className="sr-only">, </span>
              <span className="relative ml-1.5 text-xs tabular-nums opacity-70">{option.count}</span>
            </>
          )}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
