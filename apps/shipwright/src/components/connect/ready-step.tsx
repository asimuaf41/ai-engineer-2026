import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { IndexButton } from "./index-button";
import type { FormAction } from "./types";

// Step 3: a summary of what was chosen, and the button that reads the code and builds the search index.
// Only owners and admins can start it (the server checks that again). Reading the code is the first half of a scan;
// the scan itself (finding problems) arrives in a later update, and the note says so.
export function ReadyBody({
  slug,
  repo,
  project,
  canManage,
  startIndex,
}: {
  slug: string;
  repo: { appId: string; fullName: string; defaultBranch: string };
  project: { name: string; region: string } | null;
  canManage: boolean;
  startIndex: FormAction;
}) {
  return (
    <>
      <dl className="grid gap-3 rounded-xl border bg-muted/40 p-4 text-sm sm:grid-cols-3">
        <div className="min-w-0">
          <dt className="text-muted-foreground">Repository</dt>
          <dd className="truncate font-medium" title={repo.fullName}>
            {repo.fullName}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Default branch</dt>
          <dd className="truncate font-medium">{repo.defaultBranch}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Supabase project</dt>
          <dd className="truncate font-medium">{project ? `${project.name} · ${project.region}` : "Not connected (optional)"}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {canManage ? (
            <form action={startIndex}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="appId" value={repo.appId} />
              <IndexButton describedBy="first-scan-note" />
            </form>
          ) : (
            <Button type="button" size="lg" className="h-11" disabled aria-describedby="first-scan-note">
              Index my code
            </Button>
          )}
          <Button asChild variant="outline" size="lg" className="h-11">
            <Link href={`/o/${slug}/apps/${repo.appId}/code`}>View code index</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11">
            <Link href="/demo">See a sample report</Link>
          </Button>
        </div>
        <p id="first-scan-note" className="text-sm text-muted-foreground">
          {canManage ? "We read your code on our servers and keep a searchable copy. " : "Ask an admin to start this. "}
          Your first scan arrives in the next update.
        </p>
      </div>
    </>
  );
}
