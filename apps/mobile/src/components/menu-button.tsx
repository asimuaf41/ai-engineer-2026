import { useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import { SymbolView } from "expo-symbols";
import { Pressable } from "react-native";
import { useCSSVariable } from "uniwind";
import { asColor } from "@/lib/colors";

// Opens the side menu. The edge swipe does the same, but a swipe is not enough on its own (rule 17).
export function MenuButton() {
  const navigation = useNavigation();
  const foreground = asColor(useCSSVariable("--color-foreground"));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      accessibilityHint="Opens the side menu"
      hitSlop={12}
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      className="size-11 items-center justify-center rounded-full active:opacity-70"
    >
      <SymbolView name={{ ios: "line.3.horizontal", android: "menu" }} size={24} tintColor={foreground} />
    </Pressable>
  );
}
