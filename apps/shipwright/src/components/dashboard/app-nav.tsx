"use client";

import { spring } from "@repo/ui/lib/motion";
import { cn } from "@repo/ui/lib/utils";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_NAV, isActive } from "./nav";

// id keeps the sidebar's active pill and the phone menu's pill apart: layoutId is shared across the
// whole page, so two navs with the same layoutId would make one pill fly between them.
export function AppNav({ id, onNavigate }: { id: string; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard">
      <ul className="flex flex-col gap-1">
        {DASHBOARD_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:text-foreground",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`${id}-active`}
                    transition={spring.snappy}
                    aria-hidden
                    className="absolute inset-0 rounded-md bg-accent ring-1 ring-border"
                  />
                )}
                <Icon aria-hidden className="relative size-4" />
                <span className="relative">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
