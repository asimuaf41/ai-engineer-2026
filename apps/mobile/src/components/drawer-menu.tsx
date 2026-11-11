import { useRouter } from "expo-router";
import type { DrawerContentComponentProps } from "expo-router/drawer";
import Constants from "expo-constants";
import { SymbolView } from "expo-symbols";
import type { SymbolViewProps } from "expo-symbols";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";
import { asColor } from "@/lib/colors";
import { useScore } from "@/lib/triage-store";

// route = the screen's file name inside src/app/(drawer).
const ITEMS: { route: string; label: string; icon: SymbolViewProps["name"] }[] = [
  { route: "(tabs)", label: "Home", icon: { ios: "house", android: "home" } },
  { route: "report", label: "Security report", icon: { ios: "chart.bar", android: "bar_chart" } },
  { route: "history", label: "Scan history", icon: { ios: "clock.arrow.circlepath", android: "history" } },
  { route: "activity", label: "Activity", icon: { ios: "bell", android: "notifications" } },
  { route: "about", label: "About", icon: { ios: "info.circle", android: "info" } },
];

function scoreBar(score: number): string {
  if (score < 50) return "bg-critical";
  if (score < 80) return "bg-medium";
  return "bg-success";
}

export function DrawerMenu({ state, navigation }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const score = useScore();
  const [onPrimary, brand, mutedForeground] = useCSSVariable([
    "--color-primary-foreground",
    "--color-brand",
    "--color-muted-foreground",
  ]);
  const activeRoute = state.routes[state.index]?.name;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }}>
      <View className="gap-2 px-5 pb-4">
        <Text accessibilityRole="header" className="text-2xl font-bold text-foreground">
          Shipwright
        </Text>
        <Text className="text-sm text-muted-foreground">acme/checkout-app</Text>
        <View
          accessible
          accessibilityLabel={`Production score ${score} out of 100`}
          className="mt-2 gap-1"
        >
          <Text className="text-xs font-semibold text-muted-foreground">{`Production score ${score}/100`}</Text>
          <View className="h-2 overflow-hidden rounded-full bg-muted">
            <View className={`h-2 rounded-full ${scoreBar(score)}`} style={{ width: `${score}%` }} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerClassName="gap-1 px-3">
        {ITEMS.map((item) => {
          const active = activeRoute === item.route;
          return (
            <Pressable
              key={item.route}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              onPress={() => navigation.navigate(item.route)}
              className={`min-h-14 flex-row items-center gap-3 rounded-xl px-4 active:opacity-70 ${active ? "bg-brand/10" : ""}`}
            >
              <SymbolView name={item.icon} size={22} tintColor={asColor(active ? brand : mutedForeground)} />
              <Text className={`text-base font-semibold ${active ? "text-brand" : "text-foreground"}`}>{item.label}</Text>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask Shipwright"
          accessibilityHint="Opens the chat"
          onPress={() => {
            navigation.closeDrawer();
            router.push("/ask");
          }}
          className="mt-3 min-h-14 flex-row items-center gap-3 rounded-xl bg-primary px-4 active:opacity-70"
        >
          <SymbolView name={{ ios: "sparkles", android: "auto_awesome" }} size={22} tintColor={asColor(onPrimary)} />
          <Text className="text-base font-semibold text-primary-foreground">Ask Shipwright</Text>
        </Pressable>
      </ScrollView>

      <View className="gap-0.5 px-5 pt-3">
        <Text className="text-xs text-muted-foreground">{`Version ${Constants.expoConfig?.version ?? "1.0.0"}`}</Text>
        <Text className="text-xs text-muted-foreground">Demo data only. Nothing is saved.</Text>
      </View>
    </View>
  );
}
