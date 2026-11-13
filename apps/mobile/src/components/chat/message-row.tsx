import { Text, View } from "react-native";
import { MarkdownLite } from "@/components/chat/markdown-lite";
import { Thinking } from "@/components/chat/thinking";
import { ToolCard, toolStatus } from "@/components/chat/tool-card";
import { ApprovalNotice, CodeMatches, IssueResults, ProofResult, PullRequestResult } from "@/components/chat/tool-results";
import type { AskMessage } from "@/lib/ask";

type Part = AskMessage["parts"][number];

function ToolPartView({ part, chatActive }: { part: Part; chatActive: boolean }) {
  switch (part.type) {
    case "tool-listIssues": {
      const status = toolStatus(part.state, chatActive);
      return (
        <ToolCard title={`Listing ${part.input?.status ?? "open"} issues`} status={status}>
          {part.state === "output-available" ? <IssueResults issues={part.output} /> : null}
          <ToolExtras part={part} status={status} />
        </ToolCard>
      );
    }
    case "tool-searchCode": {
      const status = toolStatus(part.state, chatActive);
      return (
        <ToolCard title={`Searching code for ${part.input?.query ?? "…"}`} status={status}>
          {part.state === "output-available" ? <CodeMatches matches={part.output} /> : null}
          <ToolExtras part={part} status={status} />
        </ToolCard>
      );
    }
    case "tool-runProof": {
      const status = toolStatus(part.state, chatActive);
      return (
        <ToolCard title={`Running a live check on ${part.input?.issueId ?? "…"}`} status={status}>
          {part.state === "output-available" ? <ProofResult proof={part.output} /> : null}
          <ToolExtras part={part} status={status} />
        </ToolCard>
      );
    }
    case "tool-openFixPR": {
      const status = toolStatus(part.state, chatActive);
      return (
        <ToolCard title={`Opening a pull request for ${part.input?.issueId ?? "…"}`} status={status}>
          {part.state === "output-available" ? <PullRequestResult pullRequest={part.output} /> : null}
          <ToolExtras part={part} status={status} />
        </ToolCard>
      );
    }
    default: {
      // Old app versions stay installed for months and the server will add tools: show a generic card, never crash.
      const generic: { type: string; state?: string } = part;
      return <ToolCard title={generic.type.replace("tool-", "")} status={toolStatus(generic.state ?? "", chatActive)} />;
    }
  }
}

// What every tool can show besides its result: the safe error text, or the approval notice.
function ToolExtras({ part, status }: { part: { state: string; errorText?: string }; status: string }) {
  if (status === "waiting") return <ApprovalNotice />;
  if (part.state === "output-error" && part.errorText) {
    return (
      <Text accessibilityRole="alert" className="text-sm text-critical">
        {part.errorText}
      </Text>
    );
  }
  return null;
}

function AssistantPart({ part, chatActive }: { part: Part; chatActive: boolean }) {
  if (part.type === "text") return part.text ? <MarkdownLite text={part.text} /> : null;
  if (part.type === "reasoning") return <Thinking text={part.text} streaming={part.state === "streaming"} />;
  if (part.type.startsWith("tool-")) return <ToolPartView part={part} chatActive={chatActive} />;
  // Data parts, files, sources, step markers: nothing to show yet.
  return null;
}

export function MessageRow({ message, chatActive }: { message: AskMessage; chatActive: boolean }) {
  if (message.role === "user") {
    const text = message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
    return (
      <View className="max-w-[85%] self-end rounded-2xl bg-primary px-4 py-2">
        <Text selectable className="text-base text-primary-foreground">
          {text}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {message.parts.map((part, index) => (
        <AssistantPart key={index} part={part} chatActive={chatActive} />
      ))}
    </View>
  );
}
