import { Badge } from "@repo/ui/components/badge";
import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import Link from "next/link";
import { AuthMenu } from "@/components/auth/auth-menu";
import { LogoMark } from "@/components/logo";
import type { MyOrg, Org, OrgRole } from "@/lib/orgs";
import { CodeNav, type NavApp } from "./code-nav";
import { OrgSwitcher } from "./org-switcher";

const ROLE_LABEL: Record<OrgRole, string> = { owner: "Owner", admin: "Admin", member: "Member" };

// The bar across the top of every workspace page: which workspace, what I am in it, how to switch, and my account.
// On a phone the name shrinks with "…" and everything stays on one line.
export function OrgTopBar({ org, role, orgs, apps = [] }: { org: Org; role: OrgRole; orgs: MyOrg[]; apps?: NavApp[] }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="container-page flex h-14 items-center gap-2">
        <Link href={`/o/${org.slug}/connect`} aria-label={`${org.name} home`} className="shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <LogoMark />
        </Link>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {orgs.length >= 2 ? <OrgSwitcher currentSlug={org.slug} orgs={orgs} /> : <span className="truncate text-sm font-medium">{org.name}</span>}
          <Badge variant="secondary" className="shrink-0">
            {ROLE_LABEL[role]}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CodeNav slug={org.slug} apps={apps} />
          <ThemeToggle />
          <AuthMenu />
        </div>
      </div>
    </header>
  );
}
