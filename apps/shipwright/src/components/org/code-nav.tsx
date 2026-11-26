"use client";

// The "Code" link of the workspace bar: one app goes straight to its code page; several open a small menu to pick one.
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";

export type NavApp = { id: string; repoFullName: string };

const LINK = "flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50";

export function CodeNav({ slug, apps }: { slug: string; apps: NavApp[] }) {
  const [only] = apps;
  if (!only) return null;
  if (apps.length === 1) {
    return (
      <Link href={`/o/${slug}/apps/${only.id}/code`} className={LINK}>
        Code
        <span className="sr-only"> for {only.repoFullName}</span>
      </Link>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={LINK}>
        Code
        <ChevronDownIcon aria-hidden className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Your apps</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {apps.map((app) => (
          <DropdownMenuItem key={app.id} asChild>
            <Link href={`/o/${slug}/apps/${app.id}/code`} className="truncate">
              {app.repoFullName}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
