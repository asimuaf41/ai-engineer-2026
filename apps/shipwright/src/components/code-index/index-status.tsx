import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { IndexButton } from "@/components/connect/index-button";
import { formatCost, formatUtc, shortSha, type CodeIndexData } from "@/lib/code-index/view-data";
import { RelativeTime } from "./relative-time";
import { AutoRefresh } from "./auto-refresh";

type Reindex = (formData: FormData) => Promise<void>;
const number = new Intl.NumberFormat("en-US");

// The top of the page: which repo, and what we know about its newest finished index. "Re-index" is for owners and admins.
export function CodeHeader({ data, reindex }: { data: CodeIndexData; reindex: Reindex }) {
  const { ready, latest, canManage } = data;
  const running = latest && (latest.status === "running" || latest.status === "queued") && !latest.stopped;
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm text-muted-foreground">Code index</p>
        <h1 className="text-3xl font-semibold tracking-tight [overflow-wrap:anywhere]">{data.repoFullName}</h1>
        {ready ? (
          <p className="text-sm text-muted-foreground">
            Indexed commit <code className="font-mono text-foreground">{shortSha(ready.commitSha)}</code>
            {ready.finishedAt ? (
              <>
                {" · "}
                <RelativeTime iso={ready.finishedAt} fallback={formatUtc(ready.finishedAt)} />
              </>
            ) : null}
            {` · ${number.format(ready.filesCount)} ${ready.filesCount === 1 ? "file" : "files"} · ${formatCost(ready.costUsd)}`}
          </p>
        ) : null}
        {ready?.isSample ? (
          <p className="w-fit rounded-md border bg-muted px-2 py-1 text-xs text-muted-foreground">
            Sample index ({number.format(ready.chunksCount)} chunks)
          </p>
        ) : null}
      </div>
      {canManage && ready && !running ? (
        <form action={reindex} className="shrink-0">
          <IndexButton label="Re-index" variant="outline" />
        </form>
      ) : null}
    </header>
  );
}

// What is happening with the newest run, when it isn't a finished one: nothing yet, running, or failed.
export function IndexStatus({ data, reindex }: { data: CodeIndexData; reindex: Reindex }) {
  const { latest, canManage, filesRead } = data;

  if (!latest) {
    return (
      <section className="flex flex-col items-start gap-3 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-medium">Nothing indexed yet</h2>
        <p className="text-sm text-muted-foreground">Once we have read your code, a map of it and a search box show up here.</p>
        {canManage ? (
          <form action={reindex}>
            <IndexButton />
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Ask an admin to start the first index.</p>
        )}
      </section>
    );
  }

  if ((latest.status === "running" || latest.status === "queued") && !latest.stopped) {
    return (
      <section aria-busy="true" aria-labelledby="running-title" className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
        <AutoRefresh />
        <h2 id="running-title" className="text-lg font-medium">
          Reading your code…
        </h2>
        <p role="status" className="text-sm text-muted-foreground">
          {filesRead && filesRead > 0
            ? `Read ${number.format(filesRead)} ${filesRead === 1 ? "file" : "files"}. Now preparing it for search.`
            : "Downloading your repo and reading its files."}{" "}
          This usually takes a few minutes. You can leave this page; we keep going.
        </p>
        <div aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-brand motion-reduce:animate-none" />
        </div>
        {latest.startedAt ? <p className="text-xs text-muted-foreground">Started {formatUtc(latest.startedAt)}</p> : null}
      </section>
    );
  }

  if (latest.status === "failed" || latest.stopped) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{latest.stopped ? "The last run was stopped" : "The last run didn't finish"}</AlertTitle>
        <AlertDescription>
          <p>
            {latest.stopped
              ? "Indexing took longer than it is allowed to and was stopped. Please try again."
              : (latest.error ?? "Something went wrong on our side. Nothing was lost. Please try again in a few minutes.")}
          </p>
          {canManage ? (
            <form action={reindex} className="mt-3">
              <IndexButton label="Try again" variant="outline" />
            </form>
          ) : (
            <p className="mt-2">Ask an admin to try again.</p>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null; // ready: the header and the map say it all
}
