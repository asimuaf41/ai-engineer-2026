import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";

// Marketing pages share the public header. The dashboard has its own layout without it.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
