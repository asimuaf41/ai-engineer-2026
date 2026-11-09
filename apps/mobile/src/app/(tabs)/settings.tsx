import Constants from "expo-constants";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Uniwind, useCSSVariable, useUniwind } from "uniwind";
import { ScreenTitle } from "@/components/screen-title";
import { asColor } from "@/lib/colors";
import { useHaptics, useTriageActions } from "@/lib/triage-store";

type ThemeChoice = "system" | "light" | "dark";

const THEME_CHOICES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

// "System" means Uniwind follows the phone's setting (adaptive themes).
function useThemeChoice(): ThemeChoice {
  const { theme, hasAdaptiveThemes } = useUniwind();
  if (hasAdaptiveThemes) return "system";
  return theme === "dark" ? "dark" : "light";
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" className="px-1 text-sm font-semibold text-muted-foreground">
      {children}
    </Text>
  );
}

export default function Settings() {
  const current = useThemeChoice();
  const haptics = useHaptics();
  const { setHaptics } = useTriageActions();
  const brand = useCSSVariable("--color-brand");
  const version = Constants.expoConfig?.version ?? "unknown";

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-4 p-4">
      <ScreenTitle>Settings</ScreenTitle>

      <View className="gap-2">
        <SectionTitle>Appearance</SectionTitle>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Theme"
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          {THEME_CHOICES.map(({ value, label }, index) => {
            const selected = value === current;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{ checked: selected }}
                onPress={() => Uniwind.setTheme(value)}
                className={`flex-row items-center justify-between px-4 py-3 active:opacity-70 ${
                  index > 0 ? "border-t border-border" : ""
                }`}
              >
                <Text className="text-base text-card-foreground">{label}</Text>
                {selected ? (
                  <Text
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    className="text-lg font-bold text-brand"
                  >
                    ✓
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-2">
        <SectionTitle>Feedback</SectionTitle>
        <View className="flex-row items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <View className="flex-1 gap-0.5">
            <Text className="text-base text-card-foreground">Haptics</Text>
            <Text className="text-xs text-muted-foreground">Feel a tap when you swipe or triage an issue.</Text>
          </View>
          <Switch
            accessibilityLabel="Haptics"
            value={haptics}
            onValueChange={setHaptics}
            trackColor={{ true: asColor(brand) }}
          />
        </View>
      </View>

      <View className="gap-2">
        <SectionTitle>About</SectionTitle>
        <View className="gap-1 rounded-xl border border-border bg-card p-4">
          <Text className="text-base font-semibold text-card-foreground">Shipwright Mobile</Text>
          <Text className="text-sm text-muted-foreground">{`Version ${version}`}</Text>
          <Text className="text-sm text-muted-foreground">Demo data only. Nothing is saved.</Text>
        </View>
      </View>

      {__DEV__ ? (
        <View className="gap-2">
          <SectionTitle>Developer</SectionTitle>
          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-sm text-muted-foreground">Developer tools arrive in Part I.</Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
