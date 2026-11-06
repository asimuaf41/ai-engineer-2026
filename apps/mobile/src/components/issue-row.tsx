import type { Issue } from "@repo/ai/shared";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SeverityBadge } from "@/components/severity-badge";
import { CATEGORY_LABEL, SEVERITY_LABEL } from "@/lib/labels";

export function IssueRow({ issue }: { issue: Issue }) {
  return (
    <Link href={{ pathname: "/issues/[id]", params: { id: issue.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${SEVERITY_LABEL[issue.severity]} issue: ${issue.title}`}
        accessibilityHint="Opens the issue details"
        className="gap-2 rounded-xl border border-border bg-card p-4 active:opacity-70"
      >
        <View className="flex-row items-center justify-between gap-2">
          <SeverityBadge severity={issue.severity} />
          <Text className="text-xs text-muted-foreground">{CATEGORY_LABEL[issue.category]}</Text>
        </View>
        <Text className="text-base font-semibold text-card-foreground">{issue.title}</Text>
        <Text numberOfLines={1} className="text-xs text-muted-foreground">
          {issue.file}
        </Text>
      </Pressable>
    </Link>
  );
}
