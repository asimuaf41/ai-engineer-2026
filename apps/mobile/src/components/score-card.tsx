import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AnimatedView } from "@/components/animated";
import { openIssuesText } from "@/lib/labels";

// Full class names written out so Tailwind can see them (it can't read built-up strings).
function barColor(score: number): string {
  if (score < 50) return "bg-critical";
  if (score < 80) return "bg-medium";
  return "bg-success";
}

export function ScoreCard({ score, openCount }: { score: number; openCount: number }) {
  // progress is the live number (0 to 100) that the bar and the count-up both follow.
  const progress = useSharedValue(0);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    progress.set(withSpring(score, { damping: 18, stiffness: 120 }));
  }, [score, progress]);

  // Runs on the UI thread. A worklet can't call setState, so it hands the new integer to the JS thread.
  // The spring can overshoot a little, so the shown number stays between 0 and 100.
  useAnimatedReaction(
    () => Math.round(Math.min(100, Math.max(0, progress.get()))),
    (value, previous) => {
      if (value !== previous) scheduleOnRN(setDisplayed, value);
    },
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(0, progress.get()))}%`,
  }));

  return (
    <View
      accessible
      // The final score, so a screen reader doesn't read every number of the count-up.
      accessibilityLabel={`Production score ${score} out of 100`}
      accessibilityLiveRegion="polite"
      className="gap-2 rounded-xl border border-border bg-card p-4"
    >
      <Text className="text-sm text-muted-foreground">Production score</Text>
      <View className="flex-row items-baseline gap-1">
        <Text className="text-5xl font-bold text-card-foreground">{displayed}</Text>
        <Text className="text-lg text-muted-foreground">/100</Text>
      </View>
      <View className="h-3 overflow-hidden rounded-full bg-muted">
        <AnimatedView className={`h-full rounded-full ${barColor(score)}`} style={fillStyle} />
      </View>
      <Text className="text-xs text-muted-foreground">{`${openIssuesText(openCount)} · demo data`}</Text>
    </View>
  );
}
