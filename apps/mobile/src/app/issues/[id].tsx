import { DEMO_ISSUES } from "@repo/ai/shared";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SeverityBadge } from "@/components/severity-badge";
import { WEB_URL } from "@/lib/env";
import { CATEGORY_LABEL, STATUS_LABEL } from "@/lib/labels";
import { useIssueStatus } from "@/lib/triage-store";

function InfoCard({ heading, body }: { heading: string; body: string }) {
  return (
    <View className="gap-2 rounded-xl border border-border bg-card p-4">
      <Text accessibilityRole="header" className="text-sm font-semibold text-muted-foreground">
        {heading}
      </Text>
      <Text className="text-base text-card-foreground">{body}</Text>
    </View>
  );
}

export default function IssueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const issue = DEMO_ISSUES.find((item) => item.id === id);
  const status = useIssueStatus(id);
  const [openFailed, setOpenFailed] = useState(false);

  if (!issue) {
    return (
      <View className="flex-1 items-center justify-center gap-3 p-6">
        <Text accessibilityRole="header" className="text-lg font-semibold text-foreground">
          Issue not found
        </Text>
        <Text className="text-center text-muted-foreground">{`There is no issue called "${id}".`}</Text>
        <Link href="/issues" asChild>
          <Pressable accessibilityRole="link" hitSlop={12} className="active:opacity-70">
            <Text className="font-semibold text-brand">Back to all issues</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  // The web table searches titles (not ids), so the title is what finds this issue there.
  const dashboardUrl = `${WEB_URL}/dashboard/issues?q=${encodeURIComponent(issue.title)}`;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-4 p-4">
      <Stack.Screen options={{ title: issue.id }} />

      <View className="gap-3">
        <View className="flex-row items-center justify-between gap-2">
          <SeverityBadge severity={issue.severity} />
          <Text className="text-xs text-muted-foreground">
            {`${CATEGORY_LABEL[issue.category]} · ${STATUS_LABEL[status ?? issue.status]}`}
          </Text>
        </View>
        <Text accessibilityRole="header" className="text-2xl font-bold text-foreground">
          {issue.title}
        </Text>
        <Text className="text-sm text-muted-foreground">{issue.file}</Text>
      </View>

      <InfoCard heading={"What's wrong"} body={issue.summary} />
      <InfoCard heading="How to fix it" body={issue.fix} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open in web dashboard"
        accessibilityHint="Opens this issue in your browser"
        onPress={() => {
          setOpenFailed(false);
          Linking.openURL(dashboardUrl).catch(() => setOpenFailed(true));
        }}
        className="items-center rounded-xl bg-primary px-4 py-3 active:opacity-70"
      >
        <Text className="text-base font-semibold text-primary-foreground">Open in web dashboard</Text>
      </Pressable>
      {openFailed ? (
        <Text accessibilityRole="alert" className="text-center text-sm text-critical">
          Couldn&apos;t open the browser. Try again.
        </Text>
      ) : null}
    </ScrollView>
  );
}
