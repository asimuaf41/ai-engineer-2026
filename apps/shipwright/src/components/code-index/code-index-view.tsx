import type { SearchAction, SearchOutcome } from "@/lib/code-index/search-core";
import type { CodeIndexData } from "@/lib/code-index/view-data";
import { CodeMap, EnvVarsCard, RedactionsCard } from "./code-map";
import { CodeHeader, IndexStatus } from "./index-status";
import { SearchBox } from "./search-box";

// The whole Code page, drawn from plain data. The real page builds `data` from the database (as the signed-in person); the design
// preview builds it from fixtures. Nothing in here fetches anything, so it works in both.
export function CodeIndexView({
  data,
  search,
  reindex,
  initialSearch,
}: {
  data: CodeIndexData;
  search: SearchAction;
  // A form action that starts a new index (the real one is startIndex, with the workspace and app already filled in).
  reindex: (formData: FormData) => Promise<void>;
  // Design preview only: an answered question to start with.
  initialSearch?: { query: string; outcome: SearchOutcome };
}) {
  const hasReady = data.ready !== null;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <CodeHeader data={data} reindex={reindex} />
      <IndexStatus data={data} reindex={reindex} />
      {hasReady ? <SearchBox slug={data.slug} appId={data.appId} repoFullName={data.repoFullName} search={search} enabled initial={initialSearch} /> : null}
      {hasReady && data.map ? (
        <>
          <CodeMap data={data} map={data.map} />
          <EnvVarsCard map={data.map} />
          {data.map.redactions > 0 ? <RedactionsCard count={data.map.redactions} /> : null}
        </>
      ) : null}
    </div>
  );
}
