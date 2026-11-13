import { ASK_SUGGESTIONS } from "@repo/ai/shared";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { QuotaPill, useFetchedQuota } from "@/components/chat/quota";
import { asColor } from "@/lib/colors";

// The first two suggestions become one-tap chips on the card.
const CHIPS = ASK_SUGGESTIONS.slice(0, 2);

// The "Ask Shipwright" hero on the Overview: a brand-tinted card so it stands out from the plain white cards.
export function AskCard() {
  const router = useRouter();
  const quota = useFetchedQuota();
  const [onBrand, brand] = useCSSVariable(["--color-brand-foreground", "--color-brand"]);

  return (
    <View className="gap-4 rounded-2xl border border-brand/40 bg-brand/10 p-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask Shipwright"
        accessibilityHint="Opens the chat about your app"
        onPress={() => router.push("/ask")}
        className="min-h-14 flex-row items-center gap-3 active:opacity-70"
      >
        <View className="size-12 items-center justify-center rounded-full bg-brand">
          <SymbolView name={{ ios: "sparkles", android: "auto_awesome" }} size={24} tintColor={asColor(onBrand)} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-lg font-bold text-foreground">Ask Shipwright</Text>
          <Text className="text-sm text-muted-foreground">Get plain-English answers about your app&apos;s security.</Text>
        </View>
        <SymbolView name={{ ios: "chevron.right", android: "chevron_right" }} size={18} tintColor={asColor(brand)} />
      </Pressable>

      <View className="flex-row flex-wrap gap-2">
        {CHIPS.map((question) => (
          <Pressable
            key={question}
            accessibilityRole="button"
            accessibilityLabel={`Ask: ${question}`}
            hitSlop={4}
            onPress={() => router.push({ pathname: "/ask", params: { q: question } })}
            className="min-h-11 justify-center rounded-full border border-brand/40 bg-background px-4 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-brand">{question}</Text>
          </Pressable>
        ))}
      </View>

      {quota ? <QuotaPill quota={quota} /> : null}
    </View>
  );
}
