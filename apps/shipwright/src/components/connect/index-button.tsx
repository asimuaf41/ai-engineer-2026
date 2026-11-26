"use client";

import { Button } from "@repo/ui/components/button";
import { LoaderCircleIcon } from "lucide-react";
import { useFormStatus } from "react-dom";

// Inside a <form>: it can read whether that form is being sent, so a second click while it is sending does nothing.
export function IndexButton({
  describedBy,
  label = "Index my code",
  pendingLabel = "Starting…",
  variant = "default",
}: {
  describedBy?: string;
  label?: string;
  pendingLabel?: string;
  variant?: "default" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size="lg" className="h-11" disabled={pending} aria-busy={pending} aria-describedby={describedBy}>
      {pending ? (
        <>
          <LoaderCircleIcon aria-hidden className="animate-spin motion-reduce:animate-none" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
