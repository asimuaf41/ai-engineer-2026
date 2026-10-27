"use client";

// Reasoning: a collapsible "Thinking…" block. Open while the model thinks, closes itself once
// when thinking ends, and then the user decides. Shows how long the model thought.
import { AnimatePresence, motion } from "motion/react";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { duration, ease } from "#lib/motion";
import { cn } from "#lib/utils";
import { Shimmer } from "#ai/shimmer";

export function Reasoning({ text, isStreaming, className }: { text: string; isStreaming: boolean; className?: string }) {
  const [open, setOpen] = useState(isStreaming);
  const [seconds, setSeconds] = useState<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (isStreaming) {
      startedAt.current ??= Date.now();
      setOpen(true);
    } else if (startedAt.current !== null) {
      setSeconds(Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
      startedAt.current = null;
      // Close once. After that the user is in control.
      setOpen(false);
    }
  }, [isStreaming]);

  // Some models send empty thinking: show nothing instead of an empty block.
  if (!text && !isStreaming) return null;

  return (
    <div className={cn("text-sm", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <BrainIcon className="size-4" aria-hidden />
        {isStreaming ? <Shimmer>Thinking…</Shimmer> : seconds !== null ? `Thought for ${seconds}s` : "Thought process"}
        <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && text && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: duration.base, ease: ease.inOut }}
            className="overflow-hidden"
          >
            <p className="mt-2 border-l-2 pl-3 leading-6 whitespace-pre-wrap text-muted-foreground">{text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
