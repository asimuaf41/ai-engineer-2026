import { Button } from "@repo/ui/components/button";
import { ChevronsUpDownIcon, GitBranchIcon } from "lucide-react";
import Link from "next/link";
import { AppNav } from "./app-nav";
import { DEMO_REPO } from "./nav";

// Placeholder: the real repo switcher arrives on Day 11. Disabled so it doesn't look clickable.
// Keep this file free of server-only code: the phone menu (a client component) imports RepoSwitcher too.
export function RepoSwitcher() {
  return (
    <Button variant="outline" disabled className="w-full justify-between">
      <span className="flex items-center gap-2">
        <GitBranchIcon aria-hidden />
        {DEMO_REPO}
      </span>
      <ChevronsUpDownIcon aria-hidden />
    </Button>
  );
}

export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-4 border-r bg-background p-3 lg:flex">
      <Link href="/" className="flex items-center gap-2 px-3 py-2 font-semibold tracking-tight">
        <span aria-hidden className="size-2 rounded-full bg-brand" />
        Shipwright
      </Link>
      <RepoSwitcher />
      <AppNav id="sidebar" />
      <p className="mt-auto px-3 text-xs text-muted-foreground">
        <kbd className="rounded border bg-muted px-1 font-sans">⌘K</kbd> or{" "}
        <kbd className="rounded border bg-muted px-1 font-sans">Ctrl K</kbd> to jump anywhere
      </p>
    </aside>
  );
}
