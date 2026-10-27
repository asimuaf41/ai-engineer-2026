"use client";

// The Ask Shipwright chat. useChat streams from /api/chat; this file only decides how each
// message part looks: text, reasoning, and tool cards. All AI pieces come from @repo/ui/ai.
import { useChat } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { Message, MessageContent } from "@repo/ui/ai/message";
import { PromptInput } from "@repo/ui/ai/prompt-input";
import { Reasoning } from "@repo/ui/ai/reasoning";
import { Response } from "@repo/ui/ai/response";
import { Shimmer } from "@repo/ui/ai/shimmer";
import { ToolCard } from "@repo/ui/ai/tool-card";
import type { ToolStatus } from "@repo/ui/ai/tool-card";
import { Button } from "@repo/ui/components/button";
import { Stagger, StaggerItem } from "@repo/ui/motion/stagger";
import { useReducedMotion } from "motion/react";
import { CheckIcon, FileSearchIcon, GitPullRequestIcon, ListChecksIcon, ShieldAlertIcon, XIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Ref } from "react";
import { Feedback } from "@/components/ask/feedback";
import { CodeMatches, IssueList, ProofResult, PullRequestResult } from "@/components/ask/tool-results";
import type { AskMessage } from "@/lib/ask/tools";

type Part = AskMessage["parts"][number];
type ToolPart = Extract<Part, { type: `tool-${string}` }>;
type Approve = (response: { id: string; approved: boolean }) => void;

const SUGGESTIONS = [
  "Is my app safe to launch?",
  "What should I fix first?",
  "Did any secrets leak?",
  "Fix it: open a pull request",
];

const TOOL_UI = {
  "tool-listIssues": { icon: ListChecksIcon, running: "Checking the issue list", done: "Checked the issue list" },
  "tool-searchCode": { icon: FileSearchIcon, running: "Searching the code", done: "Searched the code" },
  "tool-runProof": { icon: ShieldAlertIcon, running: "Running a live check", done: "Ran a live check" },
  "tool-openFixPR": { icon: GitPullRequestIcon, running: "Opening a fix pull request", done: "Opened a fix pull request" },
} satisfies Record<ToolPart["type"], { icon: LucideIcon; running: string; done: string }>;

function toolStatus(state: ToolPart["state"], active: boolean): ToolStatus {
  switch (state) {
    case "approval-requested":
      // The stream has ended on purpose: it waits for the user's click.
      return "waiting";
    case "approval-responded":
      return "running";
    case "output-available":
      return "done";
    case "output-error":
      return "error";
    case "output-denied":
      return "stopped";
    default:
      // Still waiting for a result: running if the answer is live, otherwise it was cut off by Stop.
      return active ? "running" : "stopped";
  }
}

function toolDetail(part: ToolPart): string | undefined {
  switch (part.type) {
    case "tool-listIssues":
      return part.input?.status;
    case "tool-searchCode":
      return part.input?.query ? `“${part.input.query}”` : undefined;
    case "tool-runProof":
    case "tool-openFixPR":
      return part.input?.issueId;
  }
}

function toolTitle(part: ToolPart, status: ToolStatus): string {
  const ui = TOOL_UI[part.type];
  if (part.state === "output-denied") return "You said no, nothing was changed";
  if (status === "waiting") return "Open a fix pull request?";
  if (status === "done") return ui.done;
  if (status === "running") return ui.running;
  return `${ui.running} (${status === "error" ? "failed" : "stopped"})`;
}

function AskToolCard({ part, active, onApprove }: { part: ToolPart; active: boolean; onApprove: Approve }) {
  const status = toolStatus(part.state, active);

  return (
    <ToolCard
      status={status}
      title={toolTitle(part, status)}
      icon={TOOL_UI[part.type].icon}
      detail={toolDetail(part)}
      errorText={part.state === "output-error" ? part.errorText : undefined}
    >
      {part.state === "approval-requested" && part.type === "tool-openFixPR" && !part.approval.isAutomatic && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground">Shipwright will push a branch and open a PR. Nothing is merged without you.</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onApprove({ id: part.approval.id, approved: false })}>
              <XIcon aria-hidden />
              Deny
            </Button>
            <Button type="button" size="sm" onClick={() => onApprove({ id: part.approval.id, approved: true })}>
              <CheckIcon aria-hidden />
              Approve
            </Button>
          </div>
        </div>
      )}
      {part.state === "output-available" && <ToolResult part={part} />}
    </ToolCard>
  );
}

function ToolResult({ part }: { part: Extract<ToolPart, { state: "output-available" }> }) {
  switch (part.type) {
    case "tool-listIssues":
      return <IssueList issues={part.output} />;
    case "tool-searchCode":
      return <CodeMatches matches={part.output} />;
    case "tool-runProof":
      return <ProofResult proof={part.output} />;
    case "tool-openFixPR":
      return <PullRequestResult pr={part.output} />;
  }
}

function ChatMessage({
  message,
  isStreaming,
  onApprove,
  ref,
}: {
  message: AskMessage;
  isStreaming: boolean;
  onApprove: Approve;
  ref?: Ref<HTMLDivElement>;
}) {
  const from = message.role;

  return (
    <Message ref={ref} from={from} className="scroll-mt-20">
      <MessageContent>
        {message.parts.map((part, index) => {
          const key = `${message.id}-${index}`;
          if (part.type === "text") {
            return from === "user" ? (
              <p key={key} className="whitespace-pre-wrap">
                {part.text}
              </p>
            ) : (
              <Response key={key} isStreaming={isStreaming && part.state === "streaming"}>
                {part.text}
              </Response>
            );
          }
          if (part.type === "reasoning") {
            return <Reasoning key={key} text={part.text} isStreaming={isStreaming && part.state === "streaming"} />;
          }
          if (part.type in TOOL_UI) return <AskToolCard key={key} part={part as ToolPart} active={isStreaming} onApprove={onApprove} />;
          return null;
        })}
        {from === "assistant" && !isStreaming && <Feedback messageId={message.id} />}
      </MessageContent>
    </Message>
  );
}

export function AskChat() {
  const { messages, sendMessage, regenerate, stop, addToolApprovalResponse, status, error } = useChat<AskMessage>({
    throttle: 50,
    // After Approve/Deny, send the history back so the server runs or skips the tool.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const reducedMotion = useReducedMotion();
  const newestUserRef = useRef<HTMLDivElement>(null);

  const busy = status === "submitted" || status === "streaming";
  const last = messages.at(-1);
  // Before the first visible part arrives (the model is still thinking silently), show a "Thinking…" line.
  const waiting = busy && (last?.role === "user" || last?.parts.every((part) => part.type === "step-start") === true);

  // No findLast: our lib is ES2022.
  const newestUserId = messages.filter((message) => message.role === "user").at(-1)?.id;
  useEffect(() => {
    if (!newestUserId) return;
    // Bring the new question to the top, but don't chase the stream: the reader scrolls themselves.
    newestUserRef.current?.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" });
  }, [newestUserId, reducedMotion]);

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-4 py-12">
          <p className="font-mono text-sm tracking-wider text-brand uppercase">Ask Shipwright</p>
          <h1 className="text-h1 font-semibold">What do you want to know about your app?</h1>
          <p className="max-w-prose text-muted-foreground">
            Ask in plain English. Shipwright checks your scan results and your code before it answers.
          </p>
          <Stagger className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <StaggerItem key={suggestion}>
                <Button type="button" variant="outline" onClick={() => sendMessage({ text: suggestion })}>
                  {suggestion}
                </Button>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-8 py-8">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isStreaming={busy && message.id === last?.id}
              onApprove={addToolApprovalResponse}
              ref={message.id === newestUserId ? newestUserRef : undefined}
            />
          ))}
          {waiting && (
            <Message from="assistant" aria-hidden>
              <Shimmer>Thinking…</Shimmer>
            </Message>
          )}
          {error && (
            <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-critical/40 p-3 text-sm text-critical">
              <p>Something went wrong, so the answer stopped.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => regenerate()}>
                Retry
              </Button>
            </div>
          )}
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {messages.length === 0 ? "" : busy ? "Shipwright is answering" : "Answer ready"}
      </p>
      <div className="sticky bottom-0 bg-linear-to-t from-background from-70% pt-6 pb-4">
        <PromptInput
          status={status}
          onSubmit={(text) => sendMessage({ text })}
          onStop={stop}
          placeholder="Ask about your app…"
        />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Shipwright can make mistakes. Check important details before you act.
        </p>
      </div>
    </div>
  );
}
