import type { Severity } from "@repo/ai/shared";
import { Text, View } from "react-native";
import { SEVERITY_LABEL } from "@/lib/labels";

// Full class names written out so Tailwind can see them (it can't read built-up strings).
export const SEVERITY_STYLE: Record<Severity, { box: string; text: string }> = {
  critical: { box: "bg-critical/15", text: "text-critical" },
  high: { box: "bg-high/15", text: "text-high" },
  medium: { box: "bg-medium/15", text: "text-medium" },
  low: { box: "bg-low/15", text: "text-low" },
};

// Severity is shown by color AND word, never color alone.
export function SeverityBadge({ severity }: { severity: Severity }) {
  const style = SEVERITY_STYLE[severity];
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${style.box}`}>
      <Text className={`text-xs font-semibold ${style.text}`}>{SEVERITY_LABEL[severity]}</Text>
    </View>
  );
}
