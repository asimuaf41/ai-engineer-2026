import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import Link from "next/link";
import { AuthMenu } from "@/components/auth/auth-menu";
import { Logo } from "@/components/logo";

// A plain top bar for signed-in pages that don't belong to a workspace yet (creating one) or that can't be found.
export function PrivateHeader() {
  return (
    <header className="border-b">
      <div className="container-page flex h-14 items-center justify-between">
        <Link href="/" aria-label="Shipwright home" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <AuthMenu />
        </div>
      </div>
    </header>
  );
}
