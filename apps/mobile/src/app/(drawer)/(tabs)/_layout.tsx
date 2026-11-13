import { NativeTabs } from "expo-router/native-tabs";
import { useCSSVariable } from "uniwind";
import { asColor } from "@/lib/colors";
import { useOpenIssues } from "@/lib/triage-store";

export default function TabsLayout() {
  // The tab bar is native, so it takes color values, not classNames. We follow our own theme
  // (not only the phone's), so the bar stays readable when the app theme differs from the system.
  const [brand, critical, background, muted] = useCSSVariable([
    "--color-brand",
    "--color-critical",
    "--color-background",
    "--color-muted-foreground",
  ]);
  const openCount = useOpenIssues().length;
  // Each tab's content area paints the React Navigation theme's background (light by default, so white).
  // contentStyle overrides it with our token, so the tabs follow the app theme in dark mode too.
  const contentStyle = { backgroundColor: asColor(background) };

  return (
    <NativeTabs
      tintColor={asColor(brand)}
      iconColor={{ default: asColor(muted), selected: asColor(brand) }}
      labelStyle={{ default: { color: asColor(muted) }, selected: { color: asColor(brand) } }}
      backgroundColor={asColor(background)}
      badgeBackgroundColor={asColor(critical)}
    >
      <NativeTabs.Trigger name="index" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>Overview</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "gauge.with.dots.needle.50percent", selected: "gauge.with.dots.needle.67percent" }}
          md="speed"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="issues" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>Issues</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet.rectangle" md="list" />
        <NativeTabs.Trigger.Badge hidden={openCount === 0}>{String(openCount)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
