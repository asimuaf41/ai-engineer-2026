import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";

// phone: true = still shown on phones. The others hide below sm so the header stays on one line.
const NAV_LINKS = [
  { href: "/#how", label: "How it works", phone: false },
  { href: "/demo", label: "Live demo", phone: true },
  { href: "/ask", label: "Ask", phone: true },
  { href: "/dashboard", label: "Dashboard", phone: true },
  { href: "/design", label: "Design system", phone: false },
];

export function SiteHeader() {
  return (
    // viewTransitionName gives the header its own snapshot during page transitions, so it stays still
    // while the page content animates (see ::view-transition-*(site-header) in transitions.css).
    <header
      style={{ viewTransitionName: "site-header" }}
      className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md"
    >
      <div className="container-page flex h-14 items-center justify-between">
        <Link href="/" transitionTypes={["nav-back"]} className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="size-2 rounded-full bg-brand" />
          Shipwright
        </Link>
        <div className="flex items-center gap-1">
          <nav aria-label="Main">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href} className={cn(!link.phone && "hidden sm:inline-flex")}>
                  <Link
                    href={link.href}
                    className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
