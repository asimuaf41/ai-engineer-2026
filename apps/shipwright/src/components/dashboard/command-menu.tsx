"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@repo/ui/components/command";
import { Button } from "@repo/ui/components/button";
import { MonitorIcon, MoonIcon, SearchIcon, SparklesIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Suspense, use, useEffect, useState, useSyncExternalStore } from "react";
import type { CommandIssue } from "@/lib/dashboard/data";
import { issuesUrl } from "@/lib/dashboard/search-params";
import { DASHBOARD_NAV } from "./nav";

// cmdk's default fuzzy match is very loose: typing "stripe" also finds titles that merely contain
// s-t-r-i-p-e in order. Here every typed word must appear in the item's value or keywords.
function matchWords(value: string, search: string, keywords?: string[]): number {
  const haystack = `${value} ${keywords?.join(" ") ?? ""}`.toLowerCase();
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((word) => haystack.includes(word)) ? 1 : 0;
}

// Full class names written out so Tailwind can see them.
const DOT: Record<CommandIssue["severity"], string> = {
  critical: "bg-critical",
  high: "bg-high",
  medium: "bg-medium",
  low: "bg-low",
};

// The platform is only known in the browser. The server snapshot says "Mac", and React fixes up
// the text after hydration, so the server HTML and the first client render match.
const subscribe = () => () => {};
const isApple = () => /Mac|iPhone|iPad/.test(navigator.userAgent);

const PREVIEW_COUNT = 4;

function IssueItems({
  issues,
  searching,
  onSelect,
}: {
  issues: Promise<CommandIssue[]>;
  searching: boolean;
  onSelect: (issue: CommandIssue) => void;
}) {
  const all = use(issues);
  const shown = searching ? all : all.slice(0, PREVIEW_COUNT);

  return shown.map((issue) => (
    // Titles repeat across repos, so the repo and id are part of the value to keep each item unique.
    <CommandItem key={issue.id} value={`${issue.title} ${issue.repo} ${issue.id}`} onSelect={() => onSelect(issue)}>
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${DOT[issue.severity]}`} />
      <span className="truncate">{issue.title}</span>
      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{issue.repo.split("/")[1]}</span>
      <span className="sr-only">{issue.severity} severity</span>
    </CommandItem>
  ));
}

export function CommandMenu({ issues }: { issues: Promise<CommandIssue[]> }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { setTheme } = useTheme();
  const apple = useSyncExternalStore(subscribe, isApple, () => true);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.isComposing) return;
      // Stops the browser's own Ctrl+K (focus the address bar / search box).
      event.preventDefault();
      setOpen((current) => !current);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function run(action: () => void) {
    setOpen(false);
    setSearch("");
    action();
  }

  const query = search.trim();

  return (
    <>
      <Button
        variant="outline"
        aria-keyshortcuts="Meta+K Control+K"
        onClick={() => setOpen(true)}
        className="sm:w-56 sm:justify-start"
      >
        <SearchIcon aria-hidden />
        <span className="sr-only sm:not-sr-only sm:text-muted-foreground">Search or jump to…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1 font-sans text-xs text-muted-foreground sm:inline">
          {apple ? "⌘K" : "Ctrl K"}
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
        filter={matchWords}
      >
        <CommandInput value={search} onValueChange={setSearch} placeholder="Search or jump to…" />
        <CommandList>
          <CommandEmpty>Nothing found. Press Enter to ask Shipwright instead.</CommandEmpty>
          <CommandGroup heading="Go to">
            {DASHBOARD_NAV.map(({ href, label, icon: Icon, keywords }) => (
              <CommandItem key={href} value={label} keywords={keywords} onSelect={() => run(() => router.push(href))}>
                <Icon aria-hidden />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Filters">
            <CommandItem
              value="Show critical issues"
              keywords={["filter", "severity"]}
              onSelect={() => run(() => router.push(issuesUrl({ severity: ["critical"] })))}
            >
              Show critical issues
            </CommandItem>
            <CommandItem
              value="Show fixed issues"
              keywords={["filter", "status", "done"]}
              onSelect={() => run(() => router.push(issuesUrl({ status: "fixed" })))}
            >
              Show fixed issues
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Open issues">
            <Suspense fallback={<p className="px-2 py-1.5 text-sm text-muted-foreground">Loading issues…</p>}>
              <IssueItems
                issues={issues}
                searching={query !== ""}
                onSelect={(issue) => run(() => router.push(issuesUrl({ q: issue.title, status: "all" })))}
              />
            </Suspense>
          </CommandGroup>
          <CommandGroup heading="Theme">
            <CommandItem value="Light theme" keywords={["theme", "light"]} onSelect={() => run(() => setTheme("light"))}>
              <SunIcon aria-hidden />
              Light
            </CommandItem>
            <CommandItem value="Dark theme" keywords={["theme", "dark"]} onSelect={() => run(() => setTheme("dark"))}>
              <MoonIcon aria-hidden />
              Dark
            </CommandItem>
            <CommandItem value="System theme" keywords={["theme", "system", "auto"]} onSelect={() => run(() => setTheme("system"))}>
              <MonitorIcon aria-hidden />
              System
            </CommandItem>
          </CommandGroup>
          {query !== "" && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Ask AI" forceMount>
                <CommandItem
                  forceMount
                  value={`ask shipwright ${query}`}
                  onSelect={() => run(() => router.push(`/ask?q=${encodeURIComponent(query)}`))}
                >
                  <SparklesIcon aria-hidden />
                  Ask Shipwright: “{query}”
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
