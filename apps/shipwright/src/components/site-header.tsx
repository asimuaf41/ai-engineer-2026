import { Button } from "@repo/ui/components/button";
import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import Link from "next/link";
import { AuthMenu } from "@/components/auth/auth-menu";
import { HeaderNav } from "@/components/header-nav";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";

// Desktop (md+): logo, centered links, then theme / account / "Try the demo".
// Phone: logo and a hamburger that opens the drawer (MobileNav) with every link, the account row and the theme toggle.
export function SiteHeader() {
  return (
    // viewTransitionName gives the header its own snapshot during page transitions, so it stays still
    // while the page content animates (see ::view-transition-*(site-header) in transitions.css).
    <header
      style={{ viewTransitionName: "site-header" }}
      className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md"
    >
      <div className="container-page grid h-14 grid-cols-[1fr_auto] items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        <Link
          href="/"
          transitionTypes={["nav-back"]}
          aria-label="Shipwright home"
          className="justify-self-start rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>

        <HeaderNav className="hidden md:block" />

        <div className="flex items-center justify-self-end gap-1">
          <div className="hidden items-center gap-1 md:flex">
            <ThemeToggle />
            <AuthMenu />
            <Button
              asChild
              size="lg"
              className="ml-1 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Link href="/demo">Try the demo</Link>
            </Button>
          </div>
          <MobileNav className="md:hidden" />
        </div>
      </div>
    </header>
  );
}
