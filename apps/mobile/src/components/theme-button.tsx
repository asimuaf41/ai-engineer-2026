import { Pressable, Text } from "react-native";
import { Uniwind, useUniwind } from "uniwind";

type Choice = "system" | "light" | "dark";

// system -> light -> dark -> system
const NEXT: Record<Choice, Choice> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Choice, string> = { system: "System", light: "Light", dark: "Dark" };

export function ThemeButton() {
  const { theme, hasAdaptiveThemes } = useUniwind();
  // "System" means Uniwind follows the phone's setting (adaptive themes).
  const current: Choice = hasAdaptiveThemes ? "system" : theme === "dark" ? "dark" : "light";
  const next = NEXT[current];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Theme: ${LABEL[current]}. Switch to ${LABEL[next]}.`}
      hitSlop={12}
      onPress={() => Uniwind.setTheme(next)}
      className="rounded-full bg-secondary px-3 py-1.5 active:opacity-70"
    >
      <Text className="text-sm font-medium text-secondary-foreground">{LABEL[current]}</Text>
    </Pressable>
  );
}
