import Constants from "expo-constants";
import { useState } from "react";
import { Linking, Pressable, ScrollView, Switch, Text, View } from "react-native";
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

// Public contact details, shown to everyone who installs the app (clients, LinkedIn visitors).
const DEVELOPER = { name: "Asim Ali", email: "asimuaf41@gmail.com", phone: "03026046119" };

// One tappable contact line: tapping opens the mail app or the phone dialer.
function ContactRow({ label, value, url, hint }: { label: string; value: string; url: string; hint: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <View className="border-t border-border">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityHint={hint}
        hitSlop={4}
        onPress={() => {
          setFailed(false);
          Linking.openURL(url).catch(() => setFailed(true));
        }}
        className="min-h-14 justify-center px-4 py-3 active:opacity-70"
      >
        <Text className="text-xs text-muted-foreground">{label}</Text>
        <Text selectable className="text-base font-semibold text-brand">
          {value}
        </Text>
      </Pressable>
      {failed ? (
        <Text accessibilityRole="alert" className="px-4 pb-3 text-xs text-critical">
          {`Couldn't open this on your device. You can copy it instead.`}
        </Text>
      ) : null}
    </View>
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

      <View className="gap-2">
        <SectionTitle>Developer</SectionTitle>
        <View className="overflow-hidden rounded-xl border border-border bg-card">
          <View accessible accessibilityLabel={`Developer: ${DEVELOPER.name}`} className="min-h-14 justify-center px-4 py-3">
            <Text className="text-xs text-muted-foreground">Built by</Text>
            <Text className="text-base font-semibold text-card-foreground">{DEVELOPER.name}</Text>
          </View>
          <ContactRow label="Email" value={DEVELOPER.email} url={`mailto:${DEVELOPER.email}`} hint="Opens your mail app" />
          <ContactRow label="Phone" value={DEVELOPER.phone} url={`tel:${DEVELOPER.phone}`} hint="Starts a call" />
        </View>
      </View>
    </ScrollView>
  );
}
