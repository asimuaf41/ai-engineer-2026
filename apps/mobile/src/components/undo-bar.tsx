import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { FadeInDown, FadeOut } from "react-native-reanimated";
import { AnimatedView } from "@/components/animated";
import { STATUS_LABEL } from "@/lib/labels";
import { type LastAction, useLastAction, useTriageActions } from "@/lib/triage-store";

const UNDO_WINDOW_MS = 4000;

function message(action: LastAction): string {
  switch (action.to) {
    case "fixed":
      return `Marked ${action.id} fixed`;
    case "snoozed":
      return `Snoozed ${action.id}`;
    default:
      return `${STATUS_LABEL[action.to]}: ${action.id}`;
  }
}

// Shows for 4 seconds after a triage. The store keeps lastAction, so the bar only decides whether to show it.
export function UndoBar() {
  const lastAction = useLastAction();
  const { undo } = useTriageActions();
  // The action whose 4 seconds ran out. A new triage is a new object, so the bar comes back.
  const [expired, setExpired] = useState<LastAction | null>(null);

  useEffect(() => {
    if (lastAction === null) return;
    const timer = setTimeout(() => setExpired(lastAction), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [lastAction]);

  const visible = lastAction !== null && expired !== lastAction;

  return (
    <View pointerEvents="box-none" accessibilityLiveRegion="polite" className="absolute inset-x-4 bottom-4">
      {visible ? (
        <AnimatedView
          entering={FadeInDown}
          exiting={FadeOut}
          className="flex-row items-center justify-between gap-3 rounded-xl bg-foreground px-4 py-3"
        >
          <Text className="flex-1 text-base text-background">{message(lastAction)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Undo: ${message(lastAction)}`}
            hitSlop={12}
            onPress={undo}
            className="active:opacity-70"
          >
            <Text className="text-base font-bold text-background underline">Undo</Text>
          </Pressable>
        </AnimatedView>
      ) : null}
    </View>
  );
}
