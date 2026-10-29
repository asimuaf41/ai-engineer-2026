import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";

// Marketing pages share the public header. The dashboard has its own layout without it.
// The one <main> lives here (not in each page), so the skip link's target is defined once.
// tabIndex={-1} lets the skip link move focus here without making <main> a Tab stop.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
    </>
  );
}
