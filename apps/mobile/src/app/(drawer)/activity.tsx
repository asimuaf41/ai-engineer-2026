import { ACTIVITY } from "@repo/ai/shared";
import type { ActivityItem, ActivityKind } from "@repo/ai/shared";
import { SymbolView } from "expo-symbols";
import { FlatList, Text, View } from "react-native";
import { FadeInDown } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import { AnimatedView } from "@/components/animated";
import { asColor } from "@/lib/colors";

const ICON = {
  scan: { ios: "magnifyingglass", android: "search" },
  fixed: { ios: "checkmark.circle.fill", android: "check_circle" },
  pr: { ios: "arrow.triangle.pull", android: "merge" },
  escalated: { ios: "person.fill.questionmark", android: "support_agent" },
  alert: { ios: "exclamationmark.triangle.fill", android: "warning" },
} as const;

function ago(hours: number): string {
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

function Row({ item, index }: { item: ActivityItem; index: number }) {
  const [brand, success, critical, medium] = useCSSVariable([
    "--color-brand",
    "--color-success",
    "--color-critical",
    "--color-medium",
  ]);
  const tint: Record<ActivityKind, string | number | undefined> = {
    scan: brand,
    fixed: success,
    pr: brand,
    escalated: medium,
    alert: critical,
  };
  return (
    <AnimatedView
      entering={FadeInDown.delay(index * 40).springify()}
      accessible
      accessibilityLabel={`${item.text}, ${ago(item.hoursAgo)}`}
      className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4"
    >
      <SymbolView name={ICON[item.kind]} size={22} tintColor={asColor(tint[item.kind])} />
      <View className="flex-1 gap-0.5">
        <Text className="text-base text-card-foreground">{item.text}</Text>
        <Text className="text-xs text-muted-foreground">{ago(item.hoursAgo)}</Text>
      </View>
    </AnimatedView>
  );
}

export default function Activity() {
  return (
    <FlatList
      data={ACTIVITY}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => <Row item={item} index={index} />}
      ItemSeparatorComponent={() => <View className="h-3" />}
      ListEmptyComponent={<Text className="text-center text-muted-foreground">Nothing has happened yet.</Text>}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="p-4"
    />
  );
}
