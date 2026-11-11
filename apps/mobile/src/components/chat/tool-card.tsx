import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { asColor } from "@/lib/colors";

export type ToolStatus = "running" | "done" | "error" | "stopped" | "waiting";

const STATUS_LABEL: Record<ToolStatus, string> = {
  running: "Running",
  done: "Done",
  error: "Failed",
  stopped: "Stopped",
  waiting: "Needs your approval",
};

// Full class names (Tailwind can't see names built from strings).
const STATUS_TEXT: Record<ToolStatus, string> = {
  running: "text-muted-foreground",
  done: "text-success",
  error: "text-critical",
  stopped: "text-muted-foreground",
  waiting: "text-brand",
};

const STATUS_ICON = {
  running: { ios: "ellipsis.circle", android: "more_horiz" },
  done: { ios: "checkmark.circle.fill", android: "check_circle" },
  error: { ios: "exclamationmark.triangle.fill", android: "error" },
  stopped: { ios: "stop.circle", android: "stop_circle" },
  waiting: { ios: "hand.raised.fill", android: "front_hand" },
} as const;

// Turns the AI SDK part state into one of our five statuses. A tool that was still working when the
// chat stopped (Stop button, error, app in the background) is "stopped", not "running" forever.
export function toolStatus(state: string, chatActive: boolean): ToolStatus {
  if (state === "output-available") return "done";
  if (state === "output-error") return "error";
  if (state === "output-denied") return "stopped";
  if (state.startsWith("approval-")) return "waiting";
  return chatActive ? "running" : "stopped";
}

export function ToolCard({ title, status, children }: { title: string; status: ToolStatus; children?: ReactNode }) {
  const [success, critical, muted, brand] = useCSSVariable([
    "--color-success",
    "--color-critical",
    "--color-muted-foreground",
    "--color-brand",
  ]);
  const tint = { running: muted, done: success, error: critical, stopped: muted, waiting: brand }[status];

  return (
    <View className="gap-2 rounded-xl border border-border bg-card p-3">
      <View
        accessible
        accessibilityLabel={`${title}, ${STATUS_LABEL[status]}`}
        className="flex-row items-center gap-2"
      >
        <SymbolView name={STATUS_ICON[status]} size={20} tintColor={asColor(tint)} />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-card-foreground">{title}</Text>
          <Text className={`text-xs ${STATUS_TEXT[status]}`}>{STATUS_LABEL[status]}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}
