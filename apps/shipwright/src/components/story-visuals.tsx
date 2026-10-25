// One small "screen" per step of the "How it works" story: pure markup built from design tokens.
// Decorative only, so the caller marks it aria-hidden. No state, no hooks, safe in a Server Component.
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { CheckIcon, GitPullRequestIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-xl">
      <div className="border-b bg-muted/50 px-4 py-2.5 font-mono text-xs text-muted-foreground">{title}</div>
      <div className="flex-1 p-5">{children}</div>
    </div>
  );
}

// repo-rules: allow-secret-samples
// The next line is a deliberate example of the mistake Shipwright finds. It is display text, not a real key.
const SUPABASE_LINES = [
  'import { createClient } from "@supabase/supabase-js";',
  "",
  "export const supabase = createClient(",
  "  process.env.NEXT_PUBLIC_SUPABASE_URL!,",
  "  process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY!,",
  ");",
];
const LEAKED_LINE = 5;

export function FindVisual() {
  return (
    <Frame title="src/lib/supabase.ts">
      <pre className="font-mono text-xs leading-6">
        {SUPABASE_LINES.map((line, i) => (
          <div
            key={i + 1}
            className={cn("flex gap-3 rounded px-2", i + 1 === LEAKED_LINE && "bg-critical/12 text-critical")}
          >
            <span className="w-3 shrink-0 text-right text-muted-foreground tabular-nums">{i + 1}</span>
            <span className="truncate">{line}</span>
          </div>
        ))}
      </pre>
      <div className="mt-4 flex items-center gap-2 text-sm">
        <Badge variant="critical">Critical</Badge>
        <span className="text-muted-foreground">Service-role key in the browser bundle</span>
      </div>
    </Frame>
  );
}

const PROVE_LINES = [
  { command: "$ curl /rest/v1/orders -H apikey:<public key>", status: "200 OK", rest: " · 1,204 rows · emails, addresses" },
  { command: "$ curl -X DELETE /rest/v1/orders?id=eq.1042", status: "204 No Content", rest: " · row deleted" },
];

export function ProveVisual() {
  return (
    <Frame title="shipwright prove svc-key">
      <div className="space-y-3 font-mono text-xs leading-5">
        {PROVE_LINES.map((entry) => (
          <div key={entry.command}>
            <p className="truncate text-muted-foreground">{entry.command}</p>
            <p className="truncate">
              <span className="text-critical">{entry.status}</span>
              {entry.rest}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-5 rounded-lg border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
        Proven. Anyone with your public key can read and delete orders.
      </p>
    </Frame>
  );
}

export function FixVisual() {
  return (
    <Frame title="Pull request #42">
      <div className="flex items-start gap-3">
        <GitPullRequestIcon className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">fix: move the service-role key to the server</p>
          <p className="text-xs text-muted-foreground">Opened by Shipwright · 2 files changed</p>
        </div>
      </div>
      <pre className="mt-4 overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-6">
        <span className="block text-critical">-  process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY!,</span>
        <span className="block text-success">+  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,</span>
      </pre>
      <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <CheckIcon className="size-4 text-success" />
        All checks passed · ready for you to merge
      </p>
    </Frame>
  );
}

const PUSHES = [
  { sha: "a1f9c02", message: "chore: update dependencies", ok: true },
  { sha: "7be3d41", message: "feat: admin CSV export", ok: false },
  { sha: "c40a8e7", message: "fix: checkout button label", ok: true },
  { sha: "9d2b6f3", message: "docs: add setup notes", ok: true },
];

export function GuardVisual() {
  return (
    <Frame title="Guardian · every push to main">
      <ul className="space-y-2">
        {PUSHES.map((push) => (
          <li key={push.sha} className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
            {push.ok ? (
              <CheckIcon className="size-4 shrink-0 text-success" />
            ) : (
              <XIcon className="size-4 shrink-0 text-critical" />
            )}
            <span className="font-mono text-xs text-muted-foreground">{push.sha}</span>
            <span className="truncate">{push.message}</span>
            {push.ok ? null : (
              <Badge variant="critical" className="ml-auto">
                Blocked
              </Badge>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">
        The export route exposed every order. It never reached users.
      </p>
    </Frame>
  );
}
