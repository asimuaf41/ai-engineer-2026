import { Drawer } from "expo-router/drawer";
import { useCSSVariable } from "uniwind";
import { DrawerMenu } from "@/components/drawer-menu";
import { asColor } from "@/lib/colors";

// The side menu wraps the native tabs: the tabs stay exactly as they were (ADR 0010), and the menu adds the
// advanced views next to them. Open it with the menu button or by swiping in from the left edge.
export default function DrawerLayout() {
  const [background, foreground] = useCSSVariable(["--color-background", "--color-foreground"]);

  return (
    <Drawer
      drawerContent={(props) => <DrawerMenu {...props} />}
      screenOptions={{
        drawerType: "front",
        // A narrow edge, so it doesn't fight the horizontal swipe on the issue cards.
        swipeEdgeWidth: 24,
        drawerStyle: { backgroundColor: asColor(background), width: 300 },
        headerStyle: { backgroundColor: asColor(background) },
        headerTintColor: asColor(foreground),
        headerTitleStyle: { color: asColor(foreground) },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: asColor(background) },
      }}
    >
      {/* The tabs draw their own large titles, so this screen has no header. */}
      <Drawer.Screen name="(tabs)" options={{ title: "Home", headerShown: false }} />
      <Drawer.Screen name="report" options={{ title: "Security report" }} />
      <Drawer.Screen name="history" options={{ title: "Scan history" }} />
      <Drawer.Screen name="activity" options={{ title: "Activity" }} />
      <Drawer.Screen name="about" options={{ title: "About" }} />
    </Drawer>
  );
}
