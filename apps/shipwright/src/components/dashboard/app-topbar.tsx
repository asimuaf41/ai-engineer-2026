"use client";

import { Button } from "@repo/ui/components/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@repo/ui/components/sheet";
import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import { MenuIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { CommandIssue } from "@/lib/dashboard/data";
import { AppNav } from "./app-nav";
import { RepoSwitcher } from "./app-sidebar";
import { CommandMenu } from "./command-menu";
import { DASHBOARD_NAV, DEMO_REPO, isActive } from "./nav";

export function AppTopbar({ commandIssues }: { commandIssues: Promise<CommandIssue[]> }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = DASHBOARD_NAV.find((item) => isActive(pathname, item.href));

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden">
            <MenuIcon aria-hidden />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="gap-4 p-3">
          <SheetTitle className="px-3 pt-2">Shipwright</SheetTitle>
          <SheetDescription className="sr-only">Dashboard navigation</SheetDescription>
          <RepoSwitcher />
          <AppNav id="sheet" onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <nav aria-label="Breadcrumb" className="min-w-0 text-sm">
        <ol className="flex items-center gap-2">
          <li className="hidden items-center gap-2 text-muted-foreground sm:flex">
            {DEMO_REPO}
            <span aria-hidden>/</span>
          </li>
          <li className="truncate font-medium" aria-current="page">
            {current?.label ?? "Dashboard"}
          </li>
        </ol>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <CommandMenu issues={commandIssues} />
        <ThemeToggle />
      </div>
    </header>
  );
}
