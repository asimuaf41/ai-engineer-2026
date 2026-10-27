"use client";

// Message: one chat turn. Fades up when it appears; user turns sit right in a bubble,
// assistant turns fill the width. MessageContent holds the parts (text, reasoning, tools).
import { motion } from "motion/react";
import type { ComponentProps } from "react";
import { enterTransition, fadeUp } from "#lib/motion";
import { cn } from "#lib/utils";

type MessageProps = Omit<ComponentProps<typeof motion.div>, "variants" | "initial" | "animate"> & {
  from: "user" | "assistant" | "system";
};

export function Message({ from, className, ...props }: MessageProps) {
  return (
    <motion.div
      data-from={from}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={enterTransition}
      className={cn("group flex w-full flex-col gap-3", from === "user" ? "items-end" : "items-start", className)}
      {...props}
    />
  );
}

export function MessageContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3",
        "group-data-[from=user]:max-w-[85%] group-data-[from=user]:rounded-2xl group-data-[from=user]:rounded-br-md group-data-[from=user]:bg-secondary group-data-[from=user]:px-4 group-data-[from=user]:py-2.5",
        "group-data-[from=assistant]:w-full",
        className,
      )}
      {...props}
    />
  );
}
