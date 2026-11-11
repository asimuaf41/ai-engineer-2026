import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ReduceMotion, ReducedMotionConfig } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import { asColor } from "@/lib/colors";
import { TriageProvider } from "@/lib/triage-store";

export default function RootLayout() {
  // React Navigation takes style objects, not classNames, so we read the token values as colors.
  const [background, foreground] = useCSSVariable(["--color-background", "--color-foreground"]);

  return (
    // Gestures (the swipe cards) only work inside this root view.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TriageProvider>
        {/* Follow the phone's "reduce motion" setting: animations jump straight to their end value. */}
        <ReducedMotionConfig mode={ReduceMotion.System} />
        <StatusBar style="auto" />
        {/* Gives chat screens keyboard-aware views; must wrap the navigator. */}
        <KeyboardProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: asColor(background) },
              headerTintColor: asColor(foreground),
              headerTitleStyle: { color: asColor(foreground) },
              contentStyle: { backgroundColor: asColor(background) },
              headerShadowVisible: false,
              // The previous screen is inside the "(drawer)" group, so its name would show as the back label.
              headerBackButtonDisplayMode: "minimal",
            }}
          >
            <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            <Stack.Screen name="issues/[id]" options={{ title: "Issue" }} />
            <Stack.Screen name="ask" options={{ title: "Ask Shipwright" }} />
            <Stack.Screen
              name="triage/[id]"
              options={{
                presentation: "formSheet",
                sheetAllowedDetents: [0.45, 0.9],
                sheetGrabberVisible: true,
                sheetCornerRadius: 24,
                headerShown: false,
                contentStyle: { backgroundColor: asColor(background) },
              }}
            />
          </Stack>
        </KeyboardProvider>
      </TriageProvider>
    </GestureHandlerRootView>
  );
}
