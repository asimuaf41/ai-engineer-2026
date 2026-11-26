"use client";

// The search box of the Code page: a labelled input, the answer from the server action, and the matches.
// The action does the real checks (member, rate limit, validation); the checks here only save a round trip.
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Stagger, StaggerItem } from "@repo/ui/motion/stagger";
import { ExternalLinkIcon, LoaderCircleIcon, SearchIcon } from "lucide-react";
import { useId, useState, useTransition, type FormEvent } from "react";
import { githubBlobUrl, QuerySchema, type CodeHit, type SearchAction, type SearchOutcome } from "@/lib/code-index/search-core";

export const EXAMPLE_QUESTIONS = [
  "Where do we check if the user has paid?",
  "Which files read SUPABASE_SECRET_KEY?",
  "How is the Stripe webhook verified?",
] as const;

const MATCH_BADGE: Record<CodeHit["matchedBy"], { label: string; variant: "outline" | "secondary" | "success" }> = {
  keyword: { label: "keyword", variant: "outline" },
  meaning: { label: "meaning", variant: "secondary" },
  both: { label: "both", variant: "success" },
};

function HitCard({ hit, repoFullName, commitSha }: { hit: CodeHit; repoFullName: string; commitSha: string }) {
  const href = githubBlobUrl(repoFullName, commitSha, hit.path, hit.startLine, hit.endLine);
  const where = `${hit.path}:${hit.startLine}`;
  const badge = MATCH_BADGE[hit.matchedBy];
  return (
    <article className="grid grid-cols-1 gap-2 rounded-xl border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-0 items-center gap-1 rounded-sm font-mono text-xs font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 [overflow-wrap:anywhere]"
          >
            {where}
            <ExternalLinkIcon aria-hidden className="size-3 shrink-0" />
            <span className="sr-only">(opens on GitHub in a new tab)</span>
          </a>
        ) : (
          <span className="min-w-0 font-mono text-xs font-medium [overflow-wrap:anywhere]">{where}</span>
        )}
        <Badge variant={badge.variant} className="shrink-0">
          {badge.label}
        </Badge>
      </div>
      {hit.symbol ? <p className="font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">{hit.symbol}</p> : null}
      {/* tabIndex: a snippet that scrolls sideways can be reached and scrolled with the keyboard. */}
      <pre tabIndex={0} aria-label={`Code from ${hit.path}, lines ${hit.startLine} to ${hit.endLine}`} className="max-w-full overflow-x-auto rounded-md bg-muted p-2.5 font-mono text-xs leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <code>{hit.snippet}</code>
      </pre>
    </article>
  );
}

// What a screen reader is told after each search. It goes into ONE region that is always on the page: a live region that
// appears already filled is often not read at all.
function announcement(outcome: SearchOutcome | null, pending: boolean): string {
  if (pending) return "Searching.";
  if (!outcome) return "";
  switch (outcome.status) {
    case "ok":
      return outcome.hits.length === 0
        ? "No matches."
        : `${outcome.hits.length} ${outcome.hits.length === 1 ? "match" : "matches"} found in ${outcome.ms} milliseconds.`;
    case "no_index":
      return "There is nothing to search yet. Index your code first.";
    case "limited":
      return `You are searching very fast. Wait ${outcome.retryAfterSeconds} seconds and try again.`;
    case "invalid":
      return outcome.message;
    default:
      return "The search did not work this time. Please try again.";
  }
}

function Results({ outcome, repoFullName }: { outcome: SearchOutcome; repoFullName: string }) {
  switch (outcome.status) {
    case "ok": {
      if (outcome.hits.length === 0) {
        return (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No matches. Try a different word, or describe what the code does.
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {outcome.hits.length} {outcome.hits.length === 1 ? "match" : "matches"} in {outcome.ms} ms
            {outcome.keywordOnly ? ". Search by meaning is off right now, so this used keywords only" : ""}
          </p>
          {/* A new key per answer, so every search plays the entrance again. Reduced motion removes the movement (MotionProvider). */}
          {/* animate (not whileInView): the answer must appear right away, even when it starts below the fold on a phone. */}
          <Stagger key={`${outcome.ms}-${outcome.hits[0]?.path}-${outcome.hits.length}`} role="list" className="flex flex-col gap-3" interval={0.05} animate="visible" whileInView={undefined}>
            {outcome.hits.map((hit, index) => (
              <StaggerItem key={`${index}:${hit.path}:${hit.startLine}`} role="listitem">
                <HitCard hit={hit} repoFullName={repoFullName} commitSha={outcome.commitSha} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      );
    }
    case "no_index":
      return (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          There is nothing to search yet. Index your code first, and search works as soon as it finishes.
        </p>
      );
    case "limited":
      return (
        <p className="rounded-xl border p-4 text-sm">
          You're searching very fast. Wait {outcome.retryAfterSeconds} {outcome.retryAfterSeconds === 1 ? "second" : "seconds"} and try again.
        </p>
      );
    case "invalid":
      return (
        <p className="rounded-xl border border-critical/30 bg-critical/10 p-4 text-sm">
          {outcome.message}
        </p>
      );
    default:
      return (
        <p className="rounded-xl border border-critical/30 bg-critical/10 p-4 text-sm">
          The search didn't work this time. Nothing was changed. Please try again in a moment.
        </p>
      );
  }
}

export function SearchBox({
  slug,
  appId,
  repoFullName,
  search,
  enabled,
  initial,
}: {
  slug: string;
  appId: string;
  repoFullName: string;
  search: SearchAction;
  enabled: boolean;
  // Only the design preview uses this: start with a question already answered, so every state can be looked at (and scanned).
  initial?: { query: string; outcome: SearchOutcome };
}) {
  const id = useId();
  const [query, setQuery] = useState(initial?.query ?? "");
  const [outcome, setOutcome] = useState<SearchOutcome | null>(initial?.outcome ?? null);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(text: string) {
    const parsed = QuerySchema.safeParse(text);
    if (!parsed.success) {
      setProblem(parsed.error.issues[0]?.message ?? "Check your question and try again.");
      return;
    }
    setProblem(null);
    startTransition(async () => {
      try {
        setOutcome(await search(slug, appId, parsed.data));
      } catch {
        // The action answers with a plain object, so this is a lost connection or a server hiccup. Say so calmly.
        setOutcome({ status: "error" });
      }
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(query);
  }

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-6">
      <h2 id={`${id}-title`} className="text-lg font-medium">
        Search your code
      </h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
        <Label htmlFor={`${id}-query`}>Type a name or ask a question</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`${id}-query`}
            name="query"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={!enabled}
            aria-invalid={problem ? true : undefined}
            aria-describedby={`${id}-hint${problem ? ` ${id}-problem` : ""}`}
            className="h-11 sm:flex-1"
          />
          <Button type="submit" size="lg" className="h-11" disabled={!enabled || pending} aria-busy={pending}>
            {pending ? <LoaderCircleIcon aria-hidden className="animate-spin motion-reduce:animate-none" /> : <SearchIcon aria-hidden />}
            {pending ? "Searching…" : "Search"}
          </Button>
        </div>
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {enabled ? "2 to 200 characters. An exact name works, and so does a question in plain words." : "Search switches on as soon as your code is indexed."}
        </p>
        {problem ? (
          <p id={`${id}-problem`} role="alert" className="text-sm text-critical">
            {problem}
          </p>
        ) : null}
      </form>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement(outcome, pending)}
      </p>

      {outcome ? (
        <Results outcome={outcome} repoFullName={repoFullName} />
      ) : enabled ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Not sure what to ask? Try one of these:</p>
          <ul className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setQuery(example);
                    run(example);
                  }}
                  className="min-h-9 rounded-full border bg-background px-3 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
