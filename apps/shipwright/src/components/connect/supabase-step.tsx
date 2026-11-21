import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { ArrowRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { connectErrorFor } from "@/lib/connect/errors";
import type { SupabaseStep } from "@/lib/connect/state";
import { ConnectAlert } from "./connect-alert";
import { DisconnectDialog } from "./disconnect-dialog";
import { ProjectPicker } from "./project-picker";
import { TrustBox } from "./trust-box";
import type { ConnectActions } from "./types";

type Props = {
  slug: string;
  step: SupabaseStep;
  canManage: boolean;
  connectHref: string;
  pageHref: string;
  // Goes to step 3 without saving anything.
  skipHref: string;
  actions: ConnectActions;
};

const AskAdmin = () => <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Ask an admin to connect Supabase.</p>;

function SkipButton({ href }: { href: string }) {
  return (
    <Button asChild variant="ghost" size="lg" className="h-11 w-fit">
      <a href={href}>Skip for now</a>
    </Button>
  );
}

// The open step.
export function SupabaseBody({ slug, step, canManage, connectHref, pageHref, skipHref, actions }: Props) {
  switch (step.status) {
    case "coming_soon":
      return (
        <div className="flex flex-col items-start gap-2">
          <Badge variant="outline">Coming soon</Badge>
          <p className="text-sm text-muted-foreground">Connecting Supabase isn&apos;t switched on here yet.</p>
          <SkipButton href={skipHref} />
        </div>
      );

    case "not_connected":
      return (
        <>
          <p className="text-muted-foreground">Optional. It lets Shipwright look at your database setup. You can skip it and add it later.</p>
          <TrustBox
            id="supabase-trust"
            title="What Shipwright can see"
            can={["Your Supabase project's name, region and status. Read-only."]}
            cannot={["Change anything in your projects.", "See organizations you don't choose."]}
          />
          <p className="text-sm text-muted-foreground">You can remove Shipwright&apos;s access any time, here or in your Supabase account.</p>
          <div className="flex flex-wrap items-center gap-2">
            {canManage ? (
              <Button asChild size="lg" className="h-11 w-fit">
                <a href={connectHref}>
                  Connect Supabase
                  <ArrowRightIcon aria-hidden />
                </a>
              </Button>
            ) : (
              <AskAdmin />
            )}
            <SkipButton href={skipHref} />
          </div>
        </>
      );

    case "no_projects":
      return (
        <>
          <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed p-4">
            <h3 className="font-medium">No Supabase projects found</h3>
            <p className="text-sm text-muted-foreground">There are no projects in the Supabase organization you connected. Create one in Supabase, then check again.</p>
            <Button asChild variant="outline" size="lg" className="h-11">
              <a href={pageHref}>Check again</a>
            </Button>
          </div>
          <SkipButton href={skipHref} />
        </>
      );

    case "pick_project":
      return (
        <>
          <p className="text-muted-foreground">Pick the project your app uses.</p>
          <ProjectPicker slug={slug} projects={step.projects} canChoose={canManage} action={actions.chooseProject} />
          {canManage ? null : <AskAdmin />}
          <SkipButton href={skipHref} />
        </>
      );

    case "needs_reconnect": {
      const error = connectErrorFor("needs_reconnect");
      return (
        <>
          {error ? <ConnectAlert error={error} retryHref={canManage ? connectHref : pageHref} /> : null}
          <SkipButton href={skipHref} />
        </>
      );
    }

    case "error": {
      const error = connectErrorFor(step.code);
      return (
        <>
          {error ? <ConnectAlert error={error} retryHref={pageHref} /> : null}
          <SkipButton href={skipHref} />
        </>
      );
    }

    case "connected":
      return null;
  }
}

// The one-line version shown when the step is not the open one.
export function SupabaseSummary({
  slug,
  step,
  canManage,
  skipped,
  connectHref,
  actions,
}: Pick<Props, "slug" | "step" | "canManage" | "connectHref" | "actions"> & { skipped: boolean }): ReactNode {
  if (step.status === "connected") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>
          <span className="font-medium text-foreground">{step.project.name}</span> · Region {step.project.region}
        </p>
        {canManage ? <DisconnectDialog slug={slug} kind="supabase" action={actions.disconnect} /> : null}
      </div>
    );
  }
  if (step.status === "coming_soon") return <p>Coming soon.</p>;
  if (skipped) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p>Skipped for now. You can connect Supabase later.</p>
        {canManage ? (
          <Button asChild variant="outline" size="lg" className="h-11">
            <a href={connectHref}>Connect Supabase</a>
          </Button>
        ) : null}
      </div>
    );
  }
  return <p>Connect GitHub first. This step is optional.</p>;
}
