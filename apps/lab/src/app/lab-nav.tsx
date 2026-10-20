"use client";

import { cn } from "@repo/ui/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EXPERIMENTS } from "../experiments";

// Client component only because usePathname needs the browser router.
export function LabNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Experiments" className="border-b border-white/10">
      <ul className="flex gap-1 overflow-x-auto p-2">
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
                  "block rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-zinc-300 hover:bg-white/5 hover:text-zinc-100",
                  active && "bg-white/10 text-zinc-100",
                )}
              >
                {experiment.id} {experiment.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
