import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/demo", label: "Live demo" },
  { href: "/design", label: "Design system" },
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
                <li key={link.href}>
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
