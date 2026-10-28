"use client";

// Thumbs up / down under an answer. The thumb lights up at once (optimistic) and the server
// confirms in the background. If saving fails, the thumb goes back and an error line appears.
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { saveFeedback } from "@/app/(marketing)/ask/actions";
import type { Vote } from "@/app/(marketing)/ask/actions";

export function Feedback({ messageId }: { messageId: string }) {
  const [saved, setSaved] = useState<Vote>(null);
  const [shown, setShown] = useOptimistic(saved);
  const [, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function vote(value: "up" | "down") {
    const next = shown === value ? null : value;
    setFailed(false);
    startTransition(async () => {
      setShown(next);
      const result = await saveFeedback({ messageId, vote: next });
      // Updates after an await need their own startTransition.
      startTransition(() => {
        // Not calling setSaved on failure = the optimistic value rolls back by itself.
        if (result.ok) setSaved(next);
        else setFailed(true);
      });
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Good answer"
          aria-pressed={shown === "up"}
          onClick={() => vote("up")}
          className={cn(shown === "up" && "text-brand")}
        >
          <ThumbsUpIcon className={cn(shown === "up" && "fill-current")} aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Bad answer"
          aria-pressed={shown === "down"}
          onClick={() => vote("down")}
          className={cn(shown === "down" && "text-brand")}
        >
          <ThumbsDownIcon className={cn(shown === "down" && "fill-current")} aria-hidden />
        </Button>
      </div>
      {failed && (
        <p role="status" className="text-xs text-critical">
          Couldn&apos;t save your feedback. Please try again.
        </p>
      )}
    </div>
  );
}
