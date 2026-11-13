import { ASK_DEFAULT_DAILY_LIMIT, formatResetIn } from "@repo/ai/shared";
import type { AskQuota } from "@repo/ai/shared";
import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { asColor } from "@/lib/colors";
import { fetchQuota } from "@/lib/ask";

// Reads the quota once when the screen opens. If it fails we show no pill: the chat still works and the
// server enforces the limit anyway.
export function useFetchedQuota(): AskQuota | undefined {
  const [quota, setQuota] = useState<AskQuota>();
  useEffect(() => {
    let cancelled = false;
    fetchQuota()
      .then((value) => {
        if (!cancelled) setQuota(value);
      })
      .catch(() => undefined); // offline: no pill, see above
    return () => {
      cancelled = true;
    };
  }, []);
  return quota;
}

// Full class names (Tailwind can't see names built from strings): green, amber, red as questions run out.
const PILL = {
  success: { box: "bg-success/15", text: "text-success" },
  medium: { box: "bg-medium/15", text: "text-medium" },
  critical: { box: "bg-critical/15", text: "text-critical" },
} as const;

export function QuotaPill({ quota }: { quota: AskQuota }) {
  const tone = quota.remaining === 0 ? "critical" : quota.remaining <= 2 ? "medium" : "success";
  const label = `${quota.remaining} of ${quota.limit} free questions left today`;
  return (
    <View accessible accessibilityLabel={label} className={`self-start rounded-full px-3 py-1 ${PILL[tone].box}`}>
      <Text className={`text-xs font-semibold ${PILL[tone].text}`}>{label}</Text>
    </View>
  );
}

function useCountdown(resetAt: string | undefined): string | undefined {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return resetAt ? formatResetIn(resetAt, now) : undefined;
}

// Shown instead of the composer when today's questions are used up. A friendly card, never a red error.
export function LimitCard({ resetAt, limit }: { resetAt?: string; limit?: number }) {
  const resetIn = useCountdown(resetAt);
  const brand = asColor(useCSSVariable("--color-brand"));
  return (
    <View className="mx-3 mb-3 gap-3 rounded-2xl border border-brand/30 bg-brand/10 p-4">
      <View className="flex-row items-center gap-2">
        <SymbolView name={{ ios: "sparkles", android: "auto_awesome" }} size={20} tintColor={brand} />
        <Text accessibilityRole="header" className="flex-1 text-base font-bold text-foreground">
          {`You've used today's ${limit ?? ASK_DEFAULT_DAILY_LIMIT} free questions`}
        </Text>
      </View>
      <Text className="text-sm text-muted-foreground">
        Thanks for trying Shipwright! The demo is free but limited, so it stays fast for everyone.
      </Text>
      {resetIn ? <Text className="text-sm font-semibold text-foreground">{`Your questions reset in ${resetIn}`}</Text> : null}
      <Link href="/" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to the overview"
          hitSlop={8}
          className="min-h-12 items-center justify-center rounded-xl bg-primary px-4 active:opacity-70"
        >
          <Text className="text-base font-semibold text-primary-foreground">Explore the overview</Text>
        </Pressable>
      </Link>
    </View>
  );
}

export function BusyDayNote() {
  return (
    <Text accessibilityRole="text" className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
      Lots of visitors today, so you&apos;re seeing a prepared demo answer.
    </Text>
  );
}
