import type { Metadata } from "next";
import Link from "next/link";
import { ConnectSkeleton } from "@/components/connect/connect-skeleton";
import { ConnectView } from "@/components/connect/connect-view";
import { FIXTURE_NAMES, FIXTURES, isFixtureName } from "@/lib/connect/fixtures";
import { demoChooseProject, demoChooseRepo, demoDisconnect, demoStartIndex } from "./actions";

// Internal: a preview of the connect page with fake data, so the design can be checked without a database.
export const metadata: Metadata = { title: "Connect flow preview", robots: { index: false, follow: false } };

const ERROR_EXAMPLES = ["github_not_yours", "github_state", "access_denied", "needs_reconnect", "rate_limited", "unknown"] as const;

type Params = { state?: string | string[]; error?: string | string[] };

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const { state, error } = await searchParams;
  const name = typeof state === "string" ? state : undefined;
  const loading = name === "loading";
  const fixture = isFixtureName(name) ? name : "not-connected";

  const linkClass = "rounded-md border px-2.5 py-1.5 text-sm hover:bg-accent";
  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <nav aria-label="Preview states" className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4">
        <p className="text-sm font-medium">Design preview: fake data, nothing here is real.</p>
        <ul className="flex flex-wrap gap-2">
          {[...FIXTURE_NAMES, "loading"].map((item) => (
            <li key={item}>
              <Link href={`/design/connect?state=${item}`} aria-current={item === (loading ? "loading" : fixture) ? "page" : undefined} className={`${linkClass} aria-[current=page]:border-brand aria-[current=page]:bg-brand/10`}>
                {item}
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">Error examples (added to the current state):</p>
        <ul className="flex flex-wrap gap-2">
          {ERROR_EXAMPLES.map((code) => (
            <li key={code}>
              <Link href={`/design/connect?state=${loading ? "not-connected" : fixture}&error=${code}`} className={linkClass}>
                {code}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {loading ? (
        <ConnectSkeleton />
      ) : (
        <ConnectView slug="acme-labs-x7k2" input={FIXTURES[fixture]} errorValue={error} actions={{ chooseRepo: demoChooseRepo, chooseProject: demoChooseProject, disconnect: demoDisconnect, startIndex: demoStartIndex }} />
      )}
    </div>
  );
}
