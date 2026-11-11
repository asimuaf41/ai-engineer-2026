import { useChat } from "@ai-sdk/react";
import { ASK_SUGGESTIONS } from "@repo/ai/shared";
import type { AskQuota } from "@repo/ai/shared";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, AppState, FlatList, Pressable, Text, View } from "react-native";
import { KeyboardChatScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Composer } from "@/components/chat/composer";
import { MessageRow } from "@/components/chat/message-row";
import { ThinkingRow } from "@/components/chat/thinking";
import { BusyDayNote, LimitCard, QuotaPill, useFetchedQuota } from "@/components/chat/quota";
import { createAskTransport, parseAskError } from "@/lib/ask";
import type { AskMessage } from "@/lib/ask";

function Suggestions({ onPick, quota }: { onPick: (text: string) => void; quota?: AskQuota }) {
  return (
    <View className="gap-3 py-6">
      <Text accessibilityRole="header" className="text-xl font-bold text-foreground">
        Ask about acme/checkout-app
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {ASK_SUGGESTIONS.map((suggestion) => (
          <Pressable
            key={suggestion}
            accessibilityRole="button"
            accessibilityLabel={suggestion}
            hitSlop={4}
            onPress={() => onPick(suggestion)}
            className="min-h-12 justify-center rounded-full border border-border bg-card px-4 active:opacity-70"
          >
            <Text className="text-base text-card-foreground">{suggestion}</Text>
          </Pressable>
        ))}
      </View>
      {quota ? <QuotaPill quota={quota} /> : null}
    </View>
  );
}

function Notice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="gap-2 rounded-xl border border-border bg-card p-3">
      <Text accessibilityRole="alert" className="text-sm text-critical">
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry"
        hitSlop={8}
        onPress={onRetry}
        className="min-h-11 items-center justify-center rounded-xl bg-primary px-4 active:opacity-70"
      >
        <Text className="text-sm font-semibold text-primary-foreground">Retry</Text>
      </Pressable>
    </View>
  );
}

export default function AskScreen() {
  const params = useLocalSearchParams<{ q?: string | string[] }>();
  // A link can carry anything (a list, a huge string), so accept one short string only.
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 2000) : undefined;
  // No `resume` option: it uses `document`, which only exists on the web.
  const { messages, sendMessage, regenerate, stop, setMessages, clearError, status, error } = useChat<AskMessage>({
    transport: useMemo(createAskTransport, []),
    throttle: 50,
  });
  const busy = status === "submitted" || status === "streaming";
  const [interrupted, setInterrupted] = useState(false);
  const [composerHeight, setComposerHeight] = useState(0);
  const listRef = useRef<FlatList<AskMessage>>(null);
  const insets = useSafeAreaInsets();

  // The newest answer carries the freshest quota; before any answer we use the one fetched on open.
  const fetchedQuota = useFetchedQuota();
  const lastMeta = messages.filter((message) => message.role === "assistant" && message.metadata).at(-1)?.metadata;
  // Kept in state so "New chat" (which clears the messages) doesn't bring back the stale count from when the screen opened.
  const [latestQuota, setLatestQuota] = useState<AskQuota>();
  useEffect(() => {
    if (lastMeta?.quota) setLatestQuota(lastMeta.quota);
  }, [lastMeta?.quota]);
  const quota = latestQuota ?? fetchedQuota;
  const askError = error ? parseAskError(error) : undefined;
  const limitReached = askError?.kind === "daily_limit" || quota?.remaining === 0;

  const send = (text: string) => {
    setInterrupted(false);
    void sendMessage({ text });
  };

  // /ask?q=... sends that question once when the screen opens.
  const sentQuery = useRef(false);
  useEffect(() => {
    if (q && !sentQuery.current) {
      sentQuery.current = true;
      void sendMessage({ text: q });
    }
  }, [q, sendMessage]);

  // iOS pauses apps in the background and drops the network stream, so stop cleanly and offer a retry.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background" && busy) {
        stop();
        setInterrupted(true);
      }
    });
    return () => subscription.remove();
  }, [busy, stop]);

  // Tell screen readers once when an answer is done. The streaming text itself is not a live region.
  const previousStatus = useRef(status);
  useEffect(() => {
    if (previousStatus.current === "streaming" && status === "ready" && !interrupted) {
      AccessibilityInfo.announceForAccessibility("Shipwright answered");
    }
    previousStatus.current = status;
  }, [status, interrupted]);

  // Scroll when a new message starts, not on every streamed chunk.
  useEffect(() => {
    if (messages.length > 0) listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const retry = () => {
    setInterrupted(false);
    clearError();
    void regenerate();
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New chat"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              hitSlop={8}
              onPress={() => {
                setMessages([]);
                clearError();
                setInterrupted(false);
              }}
              className={`px-2 active:opacity-70 ${busy ? "opacity-40" : ""}`}
            >
              <Text className="text-base font-semibold text-brand">New chat</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(message) => message.id}
        renderItem={({ item, index }) => (
          <MessageRow message={item} chatActive={busy && index === messages.length - 1} />
        )}
        renderScrollComponent={(props) => (
          <KeyboardChatScrollView {...props} keyboardLiftBehavior="whenAtEnd" offset={composerHeight} />
        )}
        ListEmptyComponent={<Suggestions onPick={send} quota={quota} />}
        ListFooterComponent={
          <View className="gap-3">
            {status === "submitted" ? <ThinkingRow /> : null}
            {lastMeta?.mode === "busy-day" ? <BusyDayNote /> : null}
            {askError && askError.kind !== "daily_limit" ? <Notice message={askError.message} onRetry={retry} /> : null}
            {interrupted && !error ? <Notice message="Answer interrupted" onRetry={retry} /> : null}
          </View>
        }
        contentContainerClassName="gap-4 p-4"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      />
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        {limitReached ? (
          <LimitCard resetAt={askError?.resetAt ?? quota?.resetAt} limit={quota?.limit} />
        ) : (
          <Composer
            busy={busy}
            onSend={send}
            onStop={stop}
            onLayout={(event) => setComposerHeight(event.nativeEvent.layout.height)}
          />
        )}
      </KeyboardStickyView>
    </View>
  );
}
