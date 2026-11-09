import { DEMO_ISSUES } from "@repo/ai/shared";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { SeverityBadge } from "@/components/severity-badge";
import { asColor } from "@/lib/colors";
import type { TriageStatus } from "@/lib/triage-types";
import { useHaptics, useIssueStatus, useTriageActions } from "@/lib/triage-store";

type Option = {
  status: TriageStatus;
  label: string;
  hint?: string;
  buzz: () => Promise<void>;
};

const OPTIONS: Option[] = [
  {
    status: "fixed",
    label: "Mark fixed",
    buzz: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  },
  { status: "snoozed", label: "Snooze for 1 day", buzz: () => Haptics.selectionAsync() },
  { status: "dismissed", label: "Not an issue", buzz: () => Haptics.selectionAsync() },
  {
    status: "escalated",
    label: "Escalate to an expert",
    hint: "A senior engineer reviews it within 24h (demo)",
    buzz: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  },
];

export default function TriageSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const issue = DEMO_ISSUES.find((item) => item.id === id);
  const current = useIssueStatus(id);
  const { triage } = useTriageActions();
  const hapticsOn = useHaptics();
  const success = asColor(useCSSVariable("--color-success"));

  if (!issue) {
    return (
      <View className="flex-1 items-center justify-center gap-3 p-6">
        <Text accessibilityRole="header" className="text-lg font-semibold text-foreground">
          Issue not found
        </Text>
        <Text className="text-center text-muted-foreground">{`There is no issue called "${id}".`}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          onPress={() => router.back()}
          className="min-h-14 items-center justify-center px-4 active:opacity-70"
        >
          <Text className="font-semibold text-brand">Close</Text>
        </Pressable>
      </View>
    );
  }

  const choose = (option: Option) => {
    // Buzz first, then change the status and close the sheet.
    // Picking the status it already has changes nothing, so skip the buzz and just close.
    if (hapticsOn && current !== option.status) void option.buzz();
    triage(issue.id, option.status);
    router.back();
  };

  return (
    <View className="flex-1 gap-4 p-4 pt-8">
      <View className="items-start gap-2">
        <SeverityBadge severity={issue.severity} />
        <Text accessibilityRole="header" className="text-xl font-bold text-foreground">
          {issue.title}
        </Text>
      </View>

      <View className="gap-3">
        {OPTIONS.map((option) => {
          const selected = current === option.status;
          return (
            <Pressable
              key={option.status}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityHint={option.hint}
              accessibilityState={{ selected }}
              hitSlop={4}
              onPress={() => choose(option)}
              className="min-h-14 flex-row items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 active:opacity-70"
            >
              <View className="flex-1 gap-0.5">
                <Text className="text-base font-semibold text-card-foreground">{option.label}</Text>
                {option.hint ? <Text className="text-xs text-muted-foreground">{option.hint}</Text> : null}
              </View>
              {selected ? (
                <SymbolView
                  name={{ ios: "checkmark.circle.fill", android: "check_circle" }}
                  size={24}
                  tintColor={success}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
