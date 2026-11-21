import { Button } from "@repo/ui/components/button";
import Link from "next/link";

// Step 3: a summary of what was chosen, and the first scan. There are no scans yet, so the button is OFF and says why.
// (No fake scan: the real one arrives in a later update.)
export function ReadyBody({
  repo,
  project,
}: {
  repo: { fullName: string; defaultBranch: string };
  project: { name: string; region: string } | null;
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
          <Button type="button" size="lg" className="h-11" disabled aria-describedby="first-scan-note">
            Run first scan
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11">
            <Link href="/demo">See a sample report</Link>
          </Button>
        </div>
        <p id="first-scan-note" className="text-sm text-muted-foreground">
          Scans arrive in the next update.
        </p>
      </div>
    </>
  );
}
