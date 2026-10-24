import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";

export type Severity = "critical" | "high" | "medium" | "low";

export type Issue = {
  id: string;
  severity: Severity;
  title: string;
  summary: string;
  file: string;
  status: "open" | "fixed";
};

// Full class names written out so Tailwind can see them (it can't read built-up strings).
const STRIP: Record<Severity, string> = {
  critical: "before:bg-critical",
  high: "before:bg-high",
  medium: "before:bg-medium",
  low: "before:bg-low",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

// Severity is shown by color AND word (the strip + the badge text), never color alone.
export function IssueCard({ issue, onFix }: { issue: Issue; onFix?: () => void }) {
  const fixed = issue.status === "fixed";

  return (
    <Card
      className={cn(
        "relative h-full overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
        STRIP[issue.severity],
      )}
    >
      <CardHeader>
        <CardTitle className="text-h3 font-semibold">{issue.title}</CardTitle>
        <CardDescription className="font-mono text-xs">{issue.file}</CardDescription>
        <CardAction>
          {fixed ? (
            <Badge variant="success">Fixed</Badge>
          ) : (
            <Badge variant={issue.severity}>{SEVERITY_LABEL[issue.severity]}</Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{issue.summary}</p>
      </CardContent>
      <CardFooter className="mt-auto gap-2">
        <Button size="sm" disabled={fixed} onClick={onFix}>
          {fixed ? "PR merged" : "Open fix PR"}
        </Button>
        <Button size="sm" variant="ghost">
          See evidence
        </Button>
      </CardFooter>
    </Card>
  );
}
