import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCSSVariable } from "uniwind";
import { ThemeButton } from "@/components/theme-button";

// React Navigation takes style objects, not classNames, so we read the token values as colors.
function asColor(value: string | number | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function renderThemeButton() {
  return <ThemeButton />;
}

export default function RootLayout() {
  const [background, foreground] = useCSSVariable(["--color-background", "--color-foreground"]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: asColor(background) },
          headerTintColor: asColor(foreground),
          headerTitleStyle: { color: asColor(foreground) },
          contentStyle: { backgroundColor: asColor(background) },
          headerShadowVisible: false,
          headerRight: renderThemeButton,
        }}
      >
        <Stack.Screen name="index" options={{ title: "Shipwright" }} />
        <Stack.Screen name="issues/[id]" options={{ title: "Issue" }} />
      </Stack>
    </>
  );
}
