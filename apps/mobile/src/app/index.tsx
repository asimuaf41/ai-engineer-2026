import { DEMO_ISSUES, productionScore, SEVERITIES } from "@repo/ai/shared";
import { FlatList, Text, View } from "react-native";
import { IssueRow } from "@/components/issue-row";
import { SEVERITY_STYLE } from "@/components/severity-badge";
import { SEVERITY_LABEL } from "@/lib/labels";

// Computed once: the demo data never changes while the app runs.
const OPEN_ISSUES = DEMO_ISSUES.filter((issue) => issue.status === "open");
const SCORE = productionScore(DEMO_ISSUES);

function Header() {
  return (
    <View className="gap-4">
      <View
        accessible
        accessibilityLabel={`Production score ${SCORE} out of 100`}
        className="gap-1 rounded-xl border border-border bg-card p-4"
      >
        
        <Text className="text-sm text-muted-foreground">Production score </Text>
        <View className="flex-row items-baseline gap-1">
          <Text className="text-5xl font-bold text-card-foreground">{SCORE}</Text>
          <Text className="text-lg text-muted-foreground">/100</Text>
        </View>
        <Text className="text-xs text-muted-foreground">{`Demo data · ${OPEN_ISSUES.length} open issues`}</Text>
      </View>

      <View className="flex-row gap-2">
        {SEVERITIES.map((severity) => {
          const count = OPEN_ISSUES.filter((issue) => issue.severity === severity).length;
          return (
            <View
              key={severity}
              accessible
              accessibilityLabel={`${count} ${SEVERITY_LABEL[severity]} open issues`}
              className="flex-1 items-center rounded-xl border border-border bg-card py-3"
            >
              <Text className={`text-2xl font-bold ${SEVERITY_STYLE[severity].text}`}>{count}</Text>
              <Text className="text-xs text-muted-foreground">{SEVERITY_LABEL[severity]}</Text>
            </View>
          );
        })}
      </View>

      <Text accessibilityRole="header" className="text-lg font-semibold text-foreground">
        Open issues
      </Text>
    </View>
  );
}

function Empty() {
  return (
    <View className="items-center rounded-xl border border-border bg-card p-6">
      <Text className="text-center text-muted-foreground">Nothing to fix. No open issues.</Text>
    </View>
  );
}

export default function Index() {
  return (
    <FlatList
      data={OPEN_ISSUES}
      keyExtractor={(issue) => issue.id}
      renderItem={({ item }) => <IssueRow issue={item} />}
      ListHeaderComponent={Header}
      ListEmptyComponent={Empty}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-3 p-4"
    />
  );
}
