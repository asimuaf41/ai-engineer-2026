import { CATEGORIES, SCORE_TREND } from "@repo/ai/shared";
import { ScrollView, Text, View } from "react-native";
import { FadeInDown } from "react-native-reanimated";
import { AnimatedView } from "@/components/animated";
import { ScoreCard } from "@/components/score-card";
import { CATEGORY_LABEL } from "@/lib/labels";
import { useOpenIssues, useScore } from "@/lib/triage-store";

const CHART_HEIGHT = 120;

// Full class names (Tailwind can't see names built from strings).
function barColor(score: number): string {
  if (score < 50) return "bg-critical";
  if (score < 80) return "bg-medium";
  return "bg-success";
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3 rounded-xl border border-border bg-card p-4">
      <Text accessibilityRole="header" className="text-sm font-semibold text-muted-foreground">
        {title}
      </Text>
      {children}
    </View>
  );
}

// Weekly score bars. The last bar is today's live score, so triaging an issue moves it.
function TrendChart({ score }: { score: number }) {
  const points = [...SCORE_TREND.map((point) => ({ label: `${point.weeksAgo}w`, score: point.score })), { label: "Now", score }];
  const summary = points.map((point) => `${point.label}: ${point.score}`).join(", ");
  return (
    <View accessible accessibilityLabel={`Score trend. ${summary}`} className="flex-row items-end justify-between gap-2">
      {points.map((point, index) => (
        <AnimatedView key={point.label} entering={FadeInDown.delay(index * 50).springify()} className="flex-1 items-center gap-1">
          <Text className="text-xs font-semibold text-foreground">{point.score}</Text>
          <View
            className={`w-full rounded-t-md ${barColor(point.score)}`}
            style={{ height: Math.max(4, (point.score / 100) * CHART_HEIGHT) }}
          />
          <Text className="text-xs text-muted-foreground">{point.label}</Text>
        </AnimatedView>
      ))}
    </View>
  );
}

export default function SecurityReport() {
  const score = useScore();
  const openIssues = useOpenIssues();
  const counts = CATEGORIES.map((category) => ({
    category,
    count: openIssues.filter((issue) => issue.category === category).length,
  }));
  const most = Math.max(1, ...counts.map((entry) => entry.count));

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-4 p-4">
      <ScoreCard score={score} openCount={openIssues.length} />

      <Card title="Score over the last 8 weeks">
        <TrendChart score={score} />
      </Card>

      <Card title="Open issues by area">
        {openIssues.length === 0 ? (
          <Text className="text-muted-foreground">Nothing open. All clear.</Text>
        ) : (
          counts.map(({ category, count }) => (
            <View key={category} accessible accessibilityLabel={`${CATEGORY_LABEL[category]}: ${count} open`} className="gap-1">
              <View className="flex-row justify-between">
                <Text className="text-sm text-foreground">{CATEGORY_LABEL[category]}</Text>
                <Text className="text-sm font-semibold text-foreground">{count}</Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-muted">
                <View className="h-2 rounded-full bg-brand" style={{ width: `${(count / most) * 100}%` }} />
              </View>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}
