import type { AskUITools } from "@repo/ai/shared";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { SeverityBadge } from "@/components/severity-badge";
import { WEB_URL } from "@/lib/env";

// One compact result per tool. The types come from the shared AskUITools contract, so if the server
// changes a tool's output, this file stops type-checking instead of breaking on a phone.

const MAX_ISSUES = 4;
const MAX_MATCHES = 3;

function More({ count }: { count: number }) {
  return count > 0 ? <Text className="text-xs text-muted-foreground">{`+${count} more`}</Text> : null;
}

export function IssueResults({ issues }: { issues: AskUITools["listIssues"]["output"] }) {
  if (issues.length === 0) return <Text className="text-sm text-muted-foreground">No issues found.</Text>;
  return (
    <View className="gap-2">
      {issues.slice(0, MAX_ISSUES).map((issue) => (
        <View key={issue.id} className="flex-row items-center gap-2">
          <SeverityBadge severity={issue.severity} />
          <Text numberOfLines={2} className="flex-1 text-sm text-card-foreground">
            {issue.title}
          </Text>
        </View>
      ))}
      <More count={issues.length - MAX_ISSUES} />
    </View>
  );
}

export function CodeMatches({ matches }: { matches: AskUITools["searchCode"]["output"] }) {
  if (matches.length === 0) return <Text className="text-sm text-muted-foreground">No matches.</Text>;
  return (
    <View className="gap-2">
      {matches.slice(0, MAX_MATCHES).map((match) => (
        <Text key={`${match.path}:${match.line}`} selectable numberOfLines={1} className="font-mono text-xs text-card-foreground">
          {`${match.path}:${match.line}`}
        </Text>
      ))}
      <More count={matches.length - MAX_MATCHES} />
    </View>
  );
}

export function ProofResult({ proof }: { proof: AskUITools["runProof"]["output"] }) {
  return (
    <View className="gap-1">
      <Text selectable className="text-sm font-semibold text-card-foreground">
        {proof.verdict}
      </Text>
      <Text selectable numberOfLines={2} className="font-mono text-xs text-muted-foreground">
        {proof.response}
      </Text>
    </View>
  );
}

export function PullRequestResult({ pullRequest }: { pullRequest: AskUITools["openFixPR"]["output"] }) {
  return <Text className="text-sm text-card-foreground">{`Pull request #${pullRequest.number} opened.`}</Text>;
}

// Approving a change to the founder's repo on the phone is the level-up; for now it happens on the web.
export function ApprovalNotice() {
  const [failed, setFailed] = useState(false);
  return (
    <View className="gap-2">
      <Text className="text-sm text-card-foreground">Needs your approval</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Approve on the web"
        accessibilityHint="Opens Shipwright in your browser"
        hitSlop={8}
        onPress={() => {
          setFailed(false);
          Linking.openURL(`${WEB_URL}/ask`).catch(() => setFailed(true));
        }}
        className="min-h-11 items-center justify-center rounded-xl bg-primary px-4 active:opacity-70"
      >
        <Text className="text-sm font-semibold text-primary-foreground">Approve on the web</Text>
      </Pressable>
      {failed ? (
        <Text accessibilityRole="alert" className="text-xs text-critical">
          Couldn&apos;t open the browser. Try again.
        </Text>
      ) : null}
    </View>
  );
}
