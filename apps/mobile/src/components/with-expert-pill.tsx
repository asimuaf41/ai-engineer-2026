import { Text, View } from "react-native";

// Small label shown on issues that were escalated to a senior engineer.
export function WithExpertPill() {
  return (
    <View className="self-start rounded-full bg-brand/15 px-2 py-0.5">
      <Text className="text-xs font-semibold text-brand">With expert</Text>
    </View>
  );
}
