"use client";

// The list of repositories the person shared with Shipwright: searchable, newest push first, private ones marked with a lock.
// Choosing one posts a normal form to a Server Action, so it works even before the page's JavaScript has loaded.
// A person who may not choose (a plain member) sees the same list, read-only.
import { Badge } from "@repo/ui/components/badge";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { LoaderCircleIcon, LockIcon } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { formatPushed } from "@/lib/connect/format";
import { filterBy, MAX_VISIBLE, newestFirst } from "@/lib/connect/search";
import type { RepoOption } from "@/lib/connect/state";

const ROW = "flex min-h-14 w-full items-center gap-3 rounded-xl border bg-background px-4 py-2 text-left";

function RepoDetails({ repo }: { repo: RepoOption }) {
  return (
    <>
      <span className="min-w-0 flex-1">
        {/* Long names wrap (also on a phone) instead of being cut off, so the person can read the whole name. */}
        <span className="block font-medium [overflow-wrap:anywhere]">{repo.fullName}</span>
        <span className="block text-xs text-muted-foreground">
          {repo.pushedAt ? `Last push ${formatPushed(repo.pushedAt)}` : "No pushes yet"} · Branch {repo.defaultBranch}
        </span>
      </span>
      {repo.private ? (
        <Badge variant="secondary" className="shrink-0">
          <LockIcon aria-hidden />
          Private
        </Badge>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">Public</span>
      )}
    </>
  );
}

// Inside a <form>: it can read whether that form is being sent.
function ChooseButton({ repo }: { repo: RepoOption }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(ROW, "outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70")}
    >
      <RepoDetails repo={repo} />
      {pending ? <LoaderCircleIcon aria-hidden className="size-4 shrink-0 animate-spin motion-reduce:animate-none" /> : null}
      {pending ? <span className="sr-only">Choosing this repository</span> : null}
    </button>
  );
}

export function RepoPicker({
  slug,
  repos,
  canChoose,
  action,
}: {
  slug: string;
  repos: RepoOption[];
  canChoose: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const sorted = useMemo(() => newestFirst(repos, (repo) => repo.pushedAt), [repos]);
  const matches = useMemo(() => filterBy(sorted, query, (repo) => repo.fullName), [sorted, query]);
  const shown = matches.slice(0, MAX_VISIBLE);

  const total = `${repos.length} ${repos.length === 1 ? "repository" : "repositories"}`;
  const summary = query.trim() ? `${matches.length} of ${total} match` : `${total} shared with Shipwright`;
  const capped = matches.length > MAX_VISIBLE ? ` Showing the first ${MAX_VISIBLE}. Type to narrow it down.` : "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={searchId}>Find a repository</Label>
        <Input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type to search"
          autoComplete="off"
          className="h-11 text-base"
        />
      </div>
      {/* The count is announced politely as you type. */}
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {summary}.{capped}
      </p>
      {shown.length > 0 ? (
        // A long list scrolls. A scrolling box with nothing to press in it must itself be reachable by keyboard.
        <ul aria-label="Repositories" tabIndex={canChoose ? undefined : 0} className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          {shown.map((repo) => (
            <li key={repo.fullName}>
              {canChoose ? (
                <form action={action}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="fullName" value={repo.fullName} />
                  <ChooseButton repo={repo} />
                </form>
              ) : (
                <div className={ROW}>
                  <RepoDetails repo={repo} />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          {query.trim() ? "No repository matches your search." : "No repositories to show."}
        </p>
      )}
    </div>
  );
}
