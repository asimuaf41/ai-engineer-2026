import { Badge } from "@repo/ui/components/badge";
import { connectErrorFor } from "@/lib/connect/errors";
import { connectHrefs, retryHrefFor } from "@/lib/connect/links";
import { deriveConnectState, type ConnectInput } from "@/lib/connect/state";
import { ConnectAlert } from "./connect-alert";
import { GitHubBody, GitHubSummary } from "./github-step";
import { ReadyBody } from "./ready-step";
import { StepShell } from "./step-shell";
import { SupabaseBody, SupabaseSummary } from "./supabase-step";
import type { ConnectActions } from "./types";

// The whole "Connect your app" page, drawn from plain data. The real page builds `input` from the database; the design
// preview builds it from fixtures. Nothing in here fetches anything, so it works in both.
export function ConnectView({
  slug,
  input,
  errorValue,
  actions,
}: {
  slug: string;
  input: ConnectInput;
  // Whatever was in ?error= (any string, a list, or nothing). It is turned into OUR wording and never shown as it is.
  errorValue?: unknown;
  actions: ConnectActions;
}) {
  const state = deriveConnectState(input);
  const error = connectErrorFor(errorValue);

  const hrefs = connectHrefs(slug);
  const pageHref = hrefs.page;
  const githubConnectHref = hrefs.githubConnect;
  const supabaseConnectHref = hrefs.supabaseConnect;
  const skipHref = hrefs.skip;
  const retryHref = retryHrefFor(error, state, hrefs);

  const githubDone = input.github.status === "connected" ? input.github : null;
  const supabaseDone = input.supabase.status === "connected" ? input.supabase : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-sm tracking-wider text-brand uppercase">Get started</p>
        <h1 className="text-h1 font-semibold">Connect your app</h1>
        <p className="text-muted-foreground">Three short steps. The Supabase step is optional.</p>
      </header>

      {error ? <ConnectAlert error={error} retryHref={retryHref} /> : null}

      {!state.canManage ? (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">You can look around here, but only an owner or admin can connect or change things.</p>
      ) : null}

      <ol aria-label="Setup steps" className="flex flex-col gap-4">
        <StepShell
          number={1}
          title="Connect GitHub"
          state={state.github}
          summary={<GitHubSummary slug={slug} step={input.github} canManage={state.canManage} actions={actions} />}
        >
          <GitHubBody slug={slug} step={input.github} canManage={state.canManage} connectHref={githubConnectHref} pageHref={pageHref} actions={actions} />
        </StepShell>

        <StepShell
          number={2}
          title="Connect Supabase"
          state={state.supabase}
          tag={<Badge variant="outline">Optional</Badge>}
          summary={
            <SupabaseSummary slug={slug} step={input.supabase} canManage={state.canManage} skipped={state.supabase === "skipped"} connectHref={supabaseConnectHref} actions={actions} />
          }
        >
          <SupabaseBody slug={slug} step={input.supabase} canManage={state.canManage} connectHref={supabaseConnectHref} pageHref={pageHref} skipHref={skipHref} actions={actions} />
        </StepShell>

        <StepShell number={3} title="Ready for your first scan" state={state.ready} summary={<p>Finish the steps above first.</p>}>
          {githubDone ? <ReadyBody repo={githubDone.repo} project={supabaseDone?.project ?? null} /> : null}
        </StepShell>
      </ol>
    </div>
  );
}
