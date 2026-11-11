import { SCAN_HISTORY } from "@repo/ai/shared";
import type { Scan } from "@repo/ai/shared";
import { FlatList, Text, View } from "react-native";
import { FadeInDown } from "react-native-reanimated";
import { AnimatedView } from "@/components/animated";

function daysText(daysAgo: number): string {
  if (daysAgo === 0) return "Today";
  return daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`;
}

function scoreText(score: number): string {
  if (score < 50) return "text-critical";
  if (score < 80) return "text-medium";
  return "text-success";
}

function ScanRow({ scan, index, last }: { scan: Scan; index: number; last: boolean }) {
  return (
    <AnimatedView entering={FadeInDown.delay(index * 40).springify()} className="flex-row gap-3">
      {/* The timeline: a dot with a line down to the next scan. */}
      <View className="items-center">
        <View className="mt-1.5 size-3 rounded-full bg-brand" />
        {last ? null : <View className="w-0.5 flex-1 bg-border" />}
      </View>
      <View
        accessible
        accessibilityLabel={`${scan.trigger}, ${daysText(scan.daysAgo)}. Score ${scan.score}. ${scan.found} found, ${scan.fixed} fixed.`}
        className="mb-3 flex-1 gap-1 rounded-xl border border-border bg-card p-4"
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-card-foreground">{scan.trigger}</Text>
          <Text className={`text-xl font-bold ${scoreText(scan.score)}`}>{scan.score}</Text>
        </View>
        <Text className="text-sm text-muted-foreground">{`${daysText(scan.daysAgo)} · ${scan.found} found · ${scan.fixed} fixed`}</Text>
      </View>
    </AnimatedView>
  );
}

export default function ScanHistory() {
  return (
    <FlatList
      data={SCAN_HISTORY}
      keyExtractor={(scan) => scan.id}
      renderItem={({ item, index }) => <ScanRow scan={item} index={index} last={index === SCAN_HISTORY.length - 1} />}
      ListEmptyComponent={<Text className="text-center text-muted-foreground">No scans yet. Run your first scan.</Text>}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="p-4"
    />
  );
}
