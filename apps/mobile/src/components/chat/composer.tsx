import { SymbolView } from "expo-symbols";
import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";
import { asColor } from "@/lib/colors";

type Props = {
  busy: boolean; // an answer is on its way (status "submitted" or "streaming")
  onSend: (text: string) => void;
  onStop: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function Composer({ busy, onSend, onStop, onLayout }: Props) {
  const [text, setText] = useState("");
  const insets = useSafeAreaInsets();
  const [placeholderColor, onPrimary] = useCSSVariable(["--color-muted-foreground", "--color-primary-foreground"]);
  const canSend = text.trim().length > 0;

  const send = () => {
    onSend(text.trim());
    setText("");
  };

  return (
    <View
      onLayout={onLayout}
      className="flex-row items-end gap-2 border-t border-border bg-background px-3 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      <TextInput
        accessibilityLabel="Ask Shipwright"
        value={text}
        onChangeText={setText}
        placeholder="Ask Shipwright…"
        placeholderTextColor={asColor(placeholderColor)}
        multiline
        maxLength={2000}
        // About four lines; after that the input scrolls.
        className="max-h-28 min-h-11 flex-1 rounded-2xl border border-border bg-card px-4 py-2.5 text-base text-foreground"
      />
      {busy ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stop"
          accessibilityHint="Stops the answer"
          hitSlop={4}
          onPress={onStop}
          className="size-11 items-center justify-center rounded-full bg-primary active:opacity-70"
        >
          <SymbolView name={{ ios: "stop.fill", android: "stop" }} size={18} tintColor={asColor(onPrimary)} />
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          hitSlop={4}
          onPress={send}
          className={`size-11 items-center justify-center rounded-full bg-primary active:opacity-70 ${canSend ? "" : "opacity-40"}`}
        >
          <SymbolView name={{ ios: "arrow.up", android: "arrow_upward" }} size={18} tintColor={asColor(onPrimary)} />
        </Pressable>
      )}
    </View>
  );
}
