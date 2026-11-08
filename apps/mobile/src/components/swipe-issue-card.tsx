import type { Issue } from "@repo/ai/shared";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { type AccessibilityActionEvent, Text, useWindowDimensions } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import {
  Extrapolation,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useCSSVariable } from "uniwind";
import { AnimatedView } from "@/components/animated";
import { IssueRow } from "@/components/issue-row";
import { asColor } from "@/lib/colors";
import { FLY_OFF_MS, isPastThreshold, MAX_ROTATION_DEG, releaseStatus, type SwipeStatus } from "@/lib/swipe-math";
import { useHaptics, useTriageActions } from "@/lib/triage-store";

const SPRING_BACK = { damping: 18, stiffness: 120 };

// Screen-reader users get the same actions without needing the swipe gesture.
const ACCESSIBILITY_ACTIONS = [
  { name: "activate" },
  { name: "fix", label: "Mark fixed" },
  { name: "snooze", label: "Snooze" },
  { name: "longpress", label: "More triage options" },
];

export function SwipeIssueCard({ issue }: { issue: Issue }) {
  const router = useRouter();
  const { triage } = useTriageActions();
  const hapticsOn = useHaptics();
  const { width: screenWidth } = useWindowDimensions();
  // The action icons sit on a success/amber background, so they use the "background" color like the text.
  const iconColor = asColor(useCSSVariable("--color-background"));

  const translateX = useSharedValue(0);
  const cardWidth = useSharedValue(0);
  // true while the finger is past the threshold: makes the haptic tick fire once per crossing.
  const armed = useSharedValue(false);

  // These run on the JS thread. The gesture reaches them through scheduleOnRN, never directly.
  function tick() {
    if (hapticsOn) Haptics.selectionAsync();
  }

  function commit(status: SwipeStatus) {
    triage(issue.id, status);
    if (status === "fixed" && hapticsOn) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function openIssue() {
    router.push({ pathname: "/issues/[id]", params: { id: issue.id } });
  }

  function openTriageSheet() {
    router.push({ pathname: "/triage/[id]", params: { id: issue.id } });
  }

  function onAccessibilityAction(event: AccessibilityActionEvent) {
    switch (event.nativeEvent.actionName) {
      case "activate":
        openIssue();
        break;
      case "fix":
        commit("fixed");
        break;
      case "snooze":
        commit("snoozed");
        break;
      case "longpress":
        openTriageSheet();
        break;
    }
  }

  const pan = usePanGesture({
    // Sideways movement of 12 px starts the swipe; 10 px up or down hands the touch to the list scroll.
    activeOffsetX: [-12, 12],
    failOffsetY: [-10, 10],
    onUpdate: (event) => {
      "worklet";
      translateX.set(event.translationX);
      const past = isPastThreshold(event.translationX, cardWidth.get());
      if (past && !armed.get()) {
        armed.set(true);
        scheduleOnRN(tick);
      } else if (!past && armed.get()) {
        armed.set(false);
      }
    },
    onDeactivate: (event) => {
      "worklet";
      armed.set(false);
      // A canceled touch (the system took it over) always springs back.
      const status = event.canceled ? null : releaseStatus(event.translationX, event.velocityX, cardWidth.get());
      if (status === null) {
        translateX.set(withSpring(0, SPRING_BACK));
        return;
      }
      // Fly past the screen edge (not just the card width: the list has side padding).
      const target = (status === "fixed" ? 1 : -1) * screenWidth;
      translateX.set(
        withTiming(target, { duration: FLY_OFF_MS }, (finished) => {
          "worklet";
          if (finished) scheduleOnRN(commit, status);
        }),
      );
    },
  });

  const cardStyle = useAnimatedStyle(() => {
    const width = cardWidth.get();
    const x = translateX.get();
    const degrees =
      width > 0 ? interpolate(x, [-width, width], [-MAX_ROTATION_DEG, MAX_ROTATION_DEG], Extrapolation.CLAMP) : 0;
    return { transform: [{ translateX: x }, { rotate: `${degrees}deg` }] };
  });

  // Each action layer fades in only on the side you swipe towards.
  const fixedLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.get(), [0, 24], [0, 1], Extrapolation.CLAMP),
  }));
  const snoozeLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.get(), [-24, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <AnimatedView exiting={FadeOut.duration(120)} onLayout={(event) => cardWidth.set(event.nativeEvent.layout.width)}>
      <AnimatedView
        pointerEvents="none"
        style={fixedLayerStyle}
        className="absolute inset-0 flex-row items-center gap-2 rounded-xl bg-success px-5"
      >
        <SymbolView name={{ ios: "checkmark.circle.fill", android: "check_circle" }} size={24} tintColor={iconColor} />
        <Text className="text-base font-semibold text-background">Fixed</Text>
      </AnimatedView>
      <AnimatedView
        pointerEvents="none"
        style={snoozeLayerStyle}
        className="absolute inset-0 flex-row items-center justify-end gap-2 rounded-xl bg-medium px-5"
      >
        <Text className="text-base font-semibold text-background">Snooze</Text>
        <SymbolView name={{ ios: "clock.fill", android: "schedule" }} size={24} tintColor={iconColor} />
      </AnimatedView>

      <GestureDetector gesture={pan}>
        <AnimatedView style={cardStyle}>
          <IssueRow
            issue={issue}
            extra={{
              onLongPress: openTriageSheet,
              accessibilityActions: ACCESSIBILITY_ACTIONS,
              onAccessibilityAction,
              accessibilityHint: "Swipe right to mark fixed, left to snooze",
            }}
          />
        </AnimatedView>
      </GestureDetector>
    </AnimatedView>
  );
}
