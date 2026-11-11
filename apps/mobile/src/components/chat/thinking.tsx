import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AnimatedView } from "@/components/animated";

// The one looping animation in the app: a soft opacity pulse while the model is thinking.
// It stops when `active` turns false, and stays still when the phone's Reduce Motion is on.
function usePulse(active: boolean) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (active && !reduceMotion) {
      opacity.value = withRepeat(withTiming(0.45, { duration: 900 }), -1, true);
    } else {
      cancelAnimation(opacity);
      opacity.value = 1;
    }
    return () => cancelAnimation(opacity);
  }, [active, reduceMotion, opacity]);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

// A plain "Thinking…" row for the gap between sending and the first streamed word.
export function ThinkingRow() {
  const pulse = usePulse(true);
  return (
    <AnimatedView style={pulse} accessible accessibilityLabel="Thinking" className="py-2">
      <Text className="text-sm text-muted-foreground">Thinking…</Text>
    </AnimatedView>
  );
}

// A model "reasoning" part: a collapsed row; tap to read the reasoning text.
export function Thinking({ text, streaming }: { text: string; streaming: boolean }) {
  const [open, setOpen] = useState(false);
  const pulse = usePulse(streaming);
  const label = streaming ? "Thinking…" : "Thought for a moment";
  const canOpen = text.trim().length > 0;

  return (
    <View className="gap-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={canOpen ? (open ? "Hides the reasoning" : "Shows the reasoning") : undefined}
        accessibilityState={{ expanded: open, disabled: !canOpen }}
        disabled={!canOpen}
        hitSlop={8}
        onPress={() => setOpen((value) => !value)}
        className="min-h-9 justify-center active:opacity-70"
      >
        <AnimatedView style={pulse}>
          <Text className="text-sm text-muted-foreground">{canOpen ? `${label} ${open ? "▾" : "▸"}` : label}</Text>
        </AnimatedView>
      </Pressable>
      {open ? (
        <Text selectable className="text-sm text-muted-foreground">
          {text}
        </Text>
      ) : null}
    </View>
  );
}
