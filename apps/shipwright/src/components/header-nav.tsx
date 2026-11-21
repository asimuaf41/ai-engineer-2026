"use client";

// The desktop links. It is a client component only because it needs the current path (usePathname)
// to mark the active link; the active "pill" glides between links with a shared layoutId.
import { spring } from "@repo/ui/lib/motion";
import { cn } from "@repo/ui/lib/utils";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, NAV_LINKS } from "@/lib/nav-links";

export function HeaderNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className={className}>
      <ul className="flex items-center gap-0.5">
        {NAV_LINKS.map((link) => {
          const active = isNavActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative block rounded-md px-3 py-1.5 text-sm transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="header-active"
                    transition={spring.snappy}
                    aria-hidden
                    className="absolute inset-0 rounded-md bg-accent ring-1 ring-border"
                  />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
