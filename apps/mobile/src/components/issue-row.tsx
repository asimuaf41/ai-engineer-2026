import type { Issue } from "@repo/ai/shared";
import { Link } from "expo-router";
import { Pressable, type PressableProps, Text, View } from "react-native";
import { SeverityBadge } from "@/components/severity-badge";
import { WithExpertPill } from "@/components/with-expert-pill";
import { CATEGORY_LABEL, SEVERITY_LABEL } from "@/lib/labels";
import { useIssueStatus } from "@/lib/triage-store";

// Extra props a parent can add to the row's button, for example the swipe card's long-press and screen-reader actions.
export type IssueRowExtraProps = Pick<
  PressableProps,
  "onLongPress" | "accessibilityActions" | "onAccessibilityAction" | "accessibilityHint"
>;

export function IssueRow({ issue, extra }: { issue: Issue; extra?: IssueRowExtraProps }) {
  const status = useIssueStatus(issue.id);
  return (
    <Link href={{ pathname: "/issues/[id]", params: { id: issue.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${SEVERITY_LABEL[issue.severity]} issue: ${issue.title}`}
        accessibilityHint="Opens the issue details"
        {...extra}
        className="gap-2 rounded-xl border border-border bg-card p-4 active:opacity-70"
      >
        <View className="flex-row items-center justify-between gap-2">
          <SeverityBadge severity={issue.severity} />
          <Text className="text-xs text-muted-foreground">{CATEGORY_LABEL[issue.category]}</Text>
        </View>
        <Text className="text-base font-semibold text-card-foreground">{issue.title}</Text>
        {status === "escalated" ? <WithExpertPill /> : null}
        <Text numberOfLines={1} className="text-xs text-muted-foreground">
          {issue.file}
        </Text>
      </Pressable>
    </Link>
  );
}
