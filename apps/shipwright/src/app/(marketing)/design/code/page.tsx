import type { Metadata } from "next";
import Link from "next/link";
import { CodeIndexView } from "@/components/code-index/code-index-view";
import { CodeIndexSkeleton } from "@/components/code-index/code-index-skeleton";
import { CODE_FIXTURE_NAMES, getCodeFixture, isCodeFixtureName } from "@/lib/code-index/fixtures";
import { demoReindex, demoSearch } from "./actions";

// Internal: a preview of the Code page with fake data, so the design can be checked without a database (and so every state
// can be scanned for accessibility in CI). The real page is under /o/<workspace>/apps/<app>/code.
export const metadata: Metadata = { title: "Code page preview", robots: { index: false, follow: false } };

type Params = { state?: string | string[] };

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const { state } = await searchParams;
  const name = typeof state === "string" ? state : undefined;
  const loading = name === "loading";
  const fixture = isCodeFixtureName(name) ? name : "ready";
  const entry = getCodeFixture(fixture);

  const linkClass = "rounded-md border px-2.5 py-1.5 text-sm hover:bg-accent";
  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <nav aria-label="Preview states" className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4">
        <p className="text-sm font-medium">Design preview: fake data, nothing here is real.</p>
        <ul className="flex flex-wrap gap-2">
          {[...CODE_FIXTURE_NAMES, "loading"].map((item) => (
            <li key={item}>
              <Link href={`/design/code?state=${item}`} aria-current={item === (loading ? "loading" : fixture) ? "page" : undefined} className={`${linkClass} aria-[current=page]:border-brand aria-[current=page]:bg-brand/10`}>
                {item}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {loading ? <CodeIndexSkeleton /> : <CodeIndexView data={entry.data} search={demoSearch} reindex={demoReindex} initialSearch={entry.initial} />}
    </div>
  );
}
