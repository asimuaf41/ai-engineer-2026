"use client";

// A menu to jump between my workspaces. Only shown when I belong to two or more.
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import Link from "next/link";
import type { MyOrg } from "@/lib/orgs";

export function OrgSwitcher({ currentSlug, orgs }: { currentSlug: string; orgs: MyOrg[] }) {
  const current = orgs.find((org) => org.slug === currentSlug);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Switch workspace. Current: ${current?.name ?? "unknown"}`}
        className="flex min-h-10 min-w-0 items-center gap-1.5 rounded-md px-2 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="truncate">{current?.name ?? "Workspace"}</span>
        <ChevronsUpDownIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Your workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map((org) => (
          <DropdownMenuItem key={org.id} asChild>
            <Link href={`/o/${org.slug}/connect`} aria-current={org.slug === currentSlug ? "true" : undefined} className="flex items-center justify-between gap-2">
              <span className="truncate">{org.name}</span>
              {org.slug === currentSlug ? <CheckIcon aria-hidden className="size-4 shrink-0" /> : null}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
