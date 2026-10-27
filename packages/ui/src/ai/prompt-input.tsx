"use client";

// PromptInput: the chat box. Enter sends, Shift+Enter adds a new line. While the model answers
// the send button turns into a Stop button. It knows nothing about any AI library.
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Button } from "#components/button";
import { cn } from "#lib/utils";

type PromptInputProps = {
  status: "ready" | "submitted" | "streaming" | "error";
  onSubmit: (text: string) => void;
  onStop: () => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
};

export function PromptInput({ status, onSubmit, onStop, placeholder, maxLength = 2000, className }: PromptInputProps) {
  const [text, setText] = useState("");
  const busy = status === "submitted" || status === "streaming";

  function submit() {
    const value = text.trim();
    if (!value || busy) return;
    onSubmit(value);
    setText("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // isComposing: input methods (Urdu, Chinese…) use Enter to confirm a word, not to send.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-lg shadow-brand/5 focus-within:ring-[3px] focus-within:ring-ring/30",
        className,
      )}
    >
      <label htmlFor="prompt" className="sr-only">
        Message
      </label>
      <textarea
        id="prompt"
        rows={1}
        value={text}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        className="max-h-48 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm field-sizing-content outline-none placeholder:text-muted-foreground"
      />
      {busy ? (
        <Button type="button" variant="outline" size="icon" aria-label="Stop answering" onClick={onStop}>
          <SquareIcon className="fill-current" aria-hidden />
        </Button>
      ) : (
        <Button type="submit" size="icon" aria-label="Send message" disabled={!text.trim()}>
          <ArrowUpIcon aria-hidden />
        </Button>
      )}
    </form>
  );
}
