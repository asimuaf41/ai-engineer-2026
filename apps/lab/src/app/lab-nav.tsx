"use client";

import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EXPERIMENTS } from "../experiments";

// Client component only because usePathname needs the browser router.
export function LabNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Experiments" className="flex items-center gap-2 border-b p-2">
      <ul className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {EXPERIMENTS.map((experiment) => {
          const active =
            pathname === experiment.href ||
            (experiment.href !== "/" && pathname.startsWith(`${experiment.href}/`));

          return (
            <li key={experiment.id} className="shrink-0">
              <Link
                href={experiment.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  active && "bg-accent text-accent-foreground",
                )}
              >
                {experiment.id} {experiment.title}
              </Link>
            </li>
          );
        })}
      </ul>
      <ThemeToggle />
    </nav>
  );
}
