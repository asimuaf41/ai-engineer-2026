// How each tool's result looks inside a tool card in the Ask chat.
// Types come from AskMessage, so a change in a tool's output shows up here as a type error.
import { Badge } from "@repo/ui/components/badge";
import type { AskMessage } from "@/lib/ask/tools";

type ToolPart<T extends string> = Extract<AskMessage["parts"][number], { type: T; state: "output-available" }>;
type Output<T extends string> = ToolPart<T>["output"];

export function IssueList({ issues }: { issues: Output<"tool-listIssues"> }) {
  return (
    <ul className="grid grid-cols-1 gap-1.5">
      {issues.map((issue) => (
        <li key={issue.id} className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate">{issue.title}</span>
          <Badge variant={issue.severity} className="capitalize">
            {issue.severity}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export function CodeMatches({ matches }: { matches: Output<"tool-searchCode"> }) {
  if (matches.length === 0) return <p className="text-muted-foreground">No matches.</p>;

  return (
    <ul className="grid grid-cols-1 gap-2">
      {matches.map((match) => (
        <li key={`${match.path}:${match.line}`} className="grid grid-cols-1 gap-1">
          <span className="font-mono text-xs text-muted-foreground">
            {match.path}:{match.line}
          </span>
          <code className="truncate rounded bg-critical/12 px-2 py-1 font-mono text-xs text-critical">{match.code}</code>
        </li>
      ))}
    </ul>
  );
}

export function PullRequestResult({ pr }: { pr: Output<"tool-openFixPR"> }) {
  return (
    <a href={pr.url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
      Pull request #{pr.number} →
    </a>
  );
}

export function ProofResult({ proof }: { proof: Output<"tool-runProof"> }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <p className="truncate font-mono text-xs text-muted-foreground">$ {proof.request}</p>
      <p className="font-mono text-xs text-critical">{proof.response}</p>
      <p>
        <strong>Proven.</strong> {proof.verdict}
      </p>
    </div>
  );
}
