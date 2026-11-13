import { Pressable, Text, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { ScreenTitle } from "@/components/screen-title";
import { SwipeIssueCard } from "@/components/swipe-issue-card";
import { UndoBar } from "@/components/undo-bar";
import { useOpenIssues, useTriageActions } from "@/lib/triage-store";

function Empty() {
  const { reset } = useTriageActions();

  return (
    <View className="items-center gap-3 rounded-xl border border-border bg-card p-6">
      <Text className="text-center text-base text-card-foreground">Inbox zero. Nothing to fix.</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Brings back all the demo issues"
        hitSlop={12}
        onPress={reset}
        className="rounded-xl bg-primary px-4 py-3 active:opacity-70"
      >
        <Text className="text-base font-semibold text-primary-foreground">Reset demo</Text>
      </Pressable>
    </View>
  );
}

export default function Issues() {
  const openIssues = useOpenIssues();

  return (
    <View className="flex-1">
      <Animated.FlatList
        data={openIssues}
        keyExtractor={(issue) => issue.id}
        renderItem={({ item }) => <SwipeIssueCard issue={item} />}
        // When a card leaves, the cards below slide up to close the gap.
        itemLayoutAnimation={LinearTransition}
        ListHeaderComponent={<ScreenTitle>Issues</ScreenTitle>}
        ListEmptyComponent={Empty}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-3 p-4"
      />
      <UndoBar />
    </View>
  );
}
