import Constants from "expo-constants";
import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { WEB_URL } from "@/lib/env";

const POINTS = [
  "Scans your AI-built app for leaked keys, open databases and unsafe payments.",
  "Explains every problem in plain English, with the exact fix.",
  "Opens a pull request to fix it, after you approve.",
  "Escalates to a senior engineer when you want a human to check.",
];

export default function About() {
  const [failed, setFailed] = useState(false);
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-4 p-4">
      <View className="gap-2 rounded-2xl border border-brand/30 bg-brand/10 p-5">
        <Text accessibilityRole="header" className="text-3xl font-bold text-foreground">
          Shipwright
        </Text>
        <Text className="text-base text-muted-foreground">Ship your AI-built app without the security surprises.</Text>
      </View>

      <View className="gap-3 rounded-xl border border-border bg-card p-4">
        <Text accessibilityRole="header" className="text-sm font-semibold text-muted-foreground">
          What it does
        </Text>
        {POINTS.map((point) => (
          <View key={point} className="flex-row gap-2">
            <Text className="text-base text-brand">•</Text>
            <Text className="flex-1 text-base text-card-foreground">{point}</Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open the Shipwright website"
        hitSlop={8}
        onPress={() => {
          setFailed(false);
          Linking.openURL(WEB_URL).catch(() => setFailed(true));
        }}
        className="min-h-14 items-center justify-center rounded-xl bg-primary px-4 active:opacity-70"
      >
        <Text className="text-base font-semibold text-primary-foreground">Open the website</Text>
      </Pressable>
      {failed ? (
        <Text accessibilityRole="alert" className="text-center text-sm text-critical">
          Couldn&apos;t open the browser. Try again.
        </Text>
      ) : null}

      <Text className="text-center text-xs text-muted-foreground">
        {`Version ${Constants.expoConfig?.version ?? "1.0.0"} · Demo data only. Nothing is saved.`}
      </Text>
    </ScrollView>
  );
}
