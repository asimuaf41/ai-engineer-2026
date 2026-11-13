import { SEVERITIES } from "@repo/ai/shared";
import { FlatList, Text, View } from "react-native";
import { FadeInDown } from "react-native-reanimated";
import { AnimatedView } from "@/components/animated";
import { AskCard } from "@/components/ask-card";
import { IssueRow } from "@/components/issue-row";
import { ScoreCard } from "@/components/score-card";
import { ScreenTitle } from "@/components/screen-title";
import { SEVERITY_STYLE } from "@/components/severity-badge";
import { openIssuesText, SEVERITY_LABEL } from "@/lib/labels";
import { useOpenIssues, useScore } from "@/lib/triage-store";

const TOP_COUNT = 3;
const MAX_ANIMATED = 6; // more animated items would feel slow; the rest just appear
const STAGGER_MS = 40;

// Item number 0, 1, 2... counts the severity tiles first, then the list rows.
function enter(index: number) {
  return index < MAX_ANIMATED ? FadeInDown.delay(index * STAGGER_MS).springify() : undefined;
}

function Header() {
  const openIssues = useOpenIssues();
  const score = useScore();

  return (
    <View className="gap-4">
      <ScreenTitle>Overview</ScreenTitle>

      <ScoreCard score={score} openCount={openIssues.length} />

      <AnimatedView entering={enter(0)}>
        <AskCard />
      </AnimatedView>

      <View className="flex-row gap-2">
        {SEVERITIES.map((severity, index) => {
          const count = openIssues.filter((issue) => issue.severity === severity).length;
          return (
            <AnimatedView
              key={severity}
              entering={enter(index)}
              accessible
              accessibilityLabel={`${SEVERITY_LABEL[severity]}: ${openIssuesText(count)}`}
              className="flex-1 items-center rounded-xl border border-border bg-card py-3"
            >
              <Text className={`text-2xl font-bold ${SEVERITY_STYLE[severity].text}`}>{count}</Text>
              <Text className="text-xs text-muted-foreground">{SEVERITY_LABEL[severity]}</Text>
            </AnimatedView>
          );
        })}
      </View>

      {openIssues.length > 0 ? (
        <Text accessibilityRole="header" className="text-lg font-semibold text-foreground">
          Top 3 to fix
        </Text>
      ) : null}
    </View>
  );
}

function Empty() {
  return (
    <View className="items-center rounded-xl border border-border bg-card p-6">
      <Text className="text-center text-muted-foreground">Nothing urgent. All clear.</Text>
    </View>
  );
}

export default function Overview() {
  // Critical first. sort() keeps the original order for issues with the same severity.
  const top = [...useOpenIssues()]
    .sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity))
    .slice(0, TOP_COUNT);

  return (
    <FlatList
      data={top}
      keyExtractor={(issue) => issue.id}
      renderItem={({ item, index }) => (
        <AnimatedView entering={enter(SEVERITIES.length + index)}>
          <IssueRow issue={item} />
        </AnimatedView>
      )}
      ListHeaderComponent={Header}
      ListEmptyComponent={Empty}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-3 p-4"
    />
  );
}
