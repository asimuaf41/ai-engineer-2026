import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { ShieldCheckIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { KIND_LABEL, type CodeMapSummary } from "@/lib/code-index/code-map-view";
import { codeHref } from "@/lib/code-index/code-search-params";
import type { CodeIndexData } from "@/lib/code-index/view-data";

const number = new Intl.NumberFormat("en-US");

// The "what is in this repo" part: stack, a chip per kind of file (click one to list its files), the env vars used, and a calm
// note when we masked secrets. Server component: the chips are plain links to ?kind=..., so it works without any JavaScript.
export function CodeMap({ data, map }: { data: CodeIndexData; map: CodeMapSummary }) {
  const { slug, appId, selectedKind, kindFiles } = data;
  return (
    <section id="code-map" aria-labelledby="code-map-title" className="flex scroll-mt-20 flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id="code-map-title" className="text-lg font-medium">
          Your code at a glance
        </h2>
        <p className="text-sm text-muted-foreground">
          {number.format(map.total)} {map.total === 1 ? "file" : "files"}, grouped by what they do. Pick a group to see its files.
        </p>
      </div>

      {data.stack.length > 0 ? (
        <ul aria-label="Built with" className="flex flex-wrap gap-2">
          {data.stack.map((item) => (
            <li key={item}>
              <Badge variant="secondary">{item}</Badge>
            </li>
          ))}
        </ul>
      ) : null}

      {map.kinds.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No files were kept from this repo, so there is nothing to group yet.</p>
      ) : (
        <nav aria-label="File groups">
          <ul className="flex flex-wrap gap-2">
            {map.kinds.map(({ kind, label, count }) => {
              const selected = kind === selectedKind;
              return (
                <li key={kind}>
                  <Link
                    href={codeHref(slug, appId, selected ? null : kind)}
                    scroll={false}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-sm outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50",
                      selected && "border-brand bg-brand/10 font-medium",
                    )}
                  >
                    {label}
                    <span className="tabular-nums text-muted-foreground">{number.format(count)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {selectedKind && kindFiles ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">
            {KIND_LABEL[selectedKind]} <span className="font-normal text-muted-foreground">({number.format(kindFiles.total)})</span>
          </h3>
          {kindFiles.files.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files in this group.</p>
          ) : (
            <ul className="grid grid-cols-1 divide-y rounded-xl border">
              {kindFiles.files.map((file) => (
                <li key={file.path} className="flex flex-col gap-1 p-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 font-mono text-xs font-medium [overflow-wrap:anywhere]">{file.path}</span>
                    {file.isClient ? <Badge variant="outline">client</Badge> : null}
                  </div>
                  {file.symbols.length > 0 ? (
                    <ul aria-label={`Symbols in ${file.path}`} className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
                      {file.symbols.map((symbol) => (
                        <li key={`${symbol.kind}:${symbol.name}`}>
                          {symbol.name}
                          {symbol.exported ? <span className="sr-only"> (exported)</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {kindFiles.total > kindFiles.files.length ? (
            <p className="text-sm text-muted-foreground">
              Showing the first {kindFiles.files.length} of {number.format(kindFiles.total)}. Use search to find a specific file.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

// Names of environment variables the code reads. Names only, never values. A warning icon marks names that a "use client" file reads:
// code in a client file ships to the browser, so Day 16 will check each of these.
export function EnvVarsCard({ map }: { map: CodeMapSummary }) {
  return (
    <section aria-labelledby="env-title" className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:p-6">
      <h2 id="env-title" className="text-lg font-medium">
        Env vars used
      </h2>
      {map.envVars.length === 0 ? (
        <p className="text-sm text-muted-foreground">We didn't find any environment variables being read in your code.</p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {map.envVars.map((env) => (
              <li key={env.name} className="flex min-w-0 items-center gap-2 text-sm">
                {env.inClient ? (
                  <>
                    <TriangleAlertIcon aria-hidden className="size-4 shrink-0 text-high" />
                    <span className="sr-only">Read in a client file: </span>
                  </>
                ) : null}
                <span className="min-w-0 font-mono text-xs [overflow-wrap:anywhere]">{env.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {env.files} {env.files === 1 ? "file" : "files"}
                </span>
              </li>
            ))}
          </ul>
          {map.envVars.some((env) => env.inClient) ? (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-high" />
              <span>Read in a file that runs in the browser. We'll check these in the next update.</span>
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

// Shown only when something was masked. Calm on purpose: nothing is leaking from Shipwright, and the secret itself is never shown.
export function RedactionsCard({ count }: { count: number }) {
  return (
    <section aria-labelledby="redactions-title" className="flex gap-3 rounded-2xl border border-high/30 bg-high/10 p-4 sm:p-6">
      <ShieldCheckIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-high" />
      <div className="flex flex-col gap-1">
        <h2 id="redactions-title" className="font-medium">
          We found and masked {number.format(count)} {count === 1 ? "secret" : "secrets"} in your repo
        </h2>
        <p className="text-sm text-muted-foreground">We replaced them before saving anything, so they are not stored or searchable. Your full report will show where (next update).</p>
      </div>
    </section>
  );
}
