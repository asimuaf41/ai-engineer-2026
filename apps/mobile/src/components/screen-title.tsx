import { Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// The large title at the top of each tab (the tabs have no navigation header).
export function ScreenTitle({ children }: { children: string }) {
  const insets = useSafeAreaInsets();
  // iOS adds this space itself (contentInsetAdjustmentBehavior="automatic"). Android ignores that prop and
  // draws under the status bar (time, battery), so we add the status bar height there.
  const paddingTop = Platform.OS === "android" ? insets.top : 0;

  return (
    <View style={{ paddingTop }}>
      <Text accessibilityRole="header" className="text-4xl font-bold text-foreground">
        {children}
      </Text>
    </View>
  );
}
