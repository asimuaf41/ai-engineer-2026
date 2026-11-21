import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { ArrowRightIcon, ClockIcon, ExternalLinkIcon } from "lucide-react";
import type { ReactNode } from "react";
import { connectErrorFor } from "@/lib/connect/errors";
import type { GitHubStep } from "@/lib/connect/state";
import { ConnectAlert } from "./connect-alert";
import { DisconnectDialog } from "./disconnect-dialog";
import { RepoPicker } from "./repo-picker";
import { TrustBox } from "./trust-box";
import type { ConnectActions } from "./types";

type Props = {
  slug: string;
  step: GitHubStep;
  canManage: boolean;
  // The address that starts the GitHub install (a route that redirects to GitHub), and this page itself (to look again).
  connectHref: string;
  pageHref: string;
  actions: ConnectActions;
};

const intro = "Choose the repository you want Shipwright to check.";

function ConnectLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button asChild size="lg" className="h-11 w-fit">
      <a href={href}>
        {children}
        <ArrowRightIcon aria-hidden />
      </a>
    </Button>
  );
}

function ExternalButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button asChild size="lg" className="h-11 w-fit">
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
        <ExternalLinkIcon aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </Button>
  );
}

const AskAdmin = () => <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Ask an admin to connect GitHub.</p>;

// The open step.
export function GitHubBody({ slug, step, canManage, connectHref, pageHref, actions }: Props) {
  switch (step.status) {
    case "coming_soon":
      return (
        <div className="flex flex-col items-start gap-2">
          <Badge variant="outline">Coming soon</Badge>
          <p className="text-sm text-muted-foreground">Connecting GitHub isn&apos;t switched on here yet. Check back soon.</p>
        </div>
      );

    case "not_connected":
      return (
        <>
          <p className="text-muted-foreground">{intro}</p>
          <TrustBox
            id="github-trust"
            title="What Shipwright can see"
            can={["Your code, so it can read and understand it. Read-only.", "Repository details, such as its name and branches."]}
            cannot={["Change, push or merge anything.", "See any repository you don't share with it."]}
          />
          {canManage ? <ConnectLink href={connectHref}>Connect GitHub</ConnectLink> : <AskAdmin />}
        </>
      );

    case "pending_approval":
      return (
        <>
          <Alert variant="warning" role="status">
            <ClockIcon aria-hidden />
            <AlertTitle>Waiting for your GitHub org owner to approve Shipwright</AlertTitle>
            <AlertDescription>
              <p>We&apos;ll finish connecting as soon as they approve. You can close this page and come back.</p>
            </AlertDescription>
          </Alert>
          <Button asChild variant="outline" size="lg" className="h-11 w-fit">
            <a href={pageHref}>Check again</a>
          </Button>
        </>
      );

    case "no_repos":
      return (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-4">
          <h3 className="font-medium">No repositories are shared with Shipwright yet</h3>
          <p className="text-sm text-muted-foreground">On GitHub, choose which repositories Shipwright may read, then come back here.</p>
          <div className="flex flex-wrap gap-2">
            {canManage ? <ExternalButton href={step.installUrl}>Add a repo on GitHub</ExternalButton> : <AskAdmin />}
            <Button asChild variant="outline" size="lg" className="h-11">
              <a href={pageHref}>Check again</a>
            </Button>
          </div>
        </div>
      );

    case "pick_repo":
      return (
        <>
          <p className="text-muted-foreground">Pick the repository to check first. You can change it later.</p>
          <RepoPicker slug={slug} repos={step.repos} canChoose={canManage} action={actions.chooseRepo} />
          {canManage ? (
            <a
              href={step.installUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
            >
              Don&apos;t see it? Add a repo on GitHub
              <ExternalLinkIcon aria-hidden className="size-3.5" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <AskAdmin />
          )}
        </>
      );

    case "needs_reconnect": {
      const error = connectErrorFor("needs_reconnect");
      return error ? <ConnectAlert error={error} retryHref={canManage ? connectHref : pageHref} /> : null;
    }

    case "error": {
      const error = connectErrorFor(step.code);
      return error ? <ConnectAlert error={error} retryHref={pageHref} /> : null;
    }

    case "connected":
      return null;
  }
}

// The one-line version shown when the step is done.
export function GitHubSummary({ slug, step, canManage, actions }: Pick<Props, "slug" | "step" | "canManage" | "actions">): ReactNode {
  if (step.status !== "connected") return null;
  return (
    <div className="flex flex-col items-start gap-3">
      <p>
        <span className="font-medium text-foreground">{step.repo.fullName}</span> · Branch {step.repo.defaultBranch}
      </p>
      {canManage ? <DisconnectDialog slug={slug} kind="github" action={actions.disconnect} /> : null}
    </div>
  );
}
