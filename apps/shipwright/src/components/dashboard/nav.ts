import { LayoutDashboardIcon, ListChecksIcon, PaletteIcon, SparklesIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Placeholder until the repo switcher is real (Day 11).
export const DEMO_REPO = "acme/checkout-app";

type NavItem = { href: string; label: string; icon: LucideIcon; keywords: string[] };

// keywords are extra words the command menu matches on, so "bugs" finds Issues.
export const DASHBOARD_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboardIcon, keywords: ["home", "score", "summary"] },
  { href: "/dashboard/issues", label: "Issues", icon: ListChecksIcon, keywords: ["bugs", "problems", "findings", "table"] },
  { href: "/ask", label: "Ask Shipwright", icon: SparklesIcon, keywords: ["chat", "ai", "question", "help"] },
  { href: "/design", label: "Design system", icon: PaletteIcon, keywords: ["components", "tokens", "colors", "ui"] },
];

// "/dashboard" matches only itself (otherwise it would be active on every page below it);
// the other links are also active on their child pages, like /dashboard/issues/123.
export function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
