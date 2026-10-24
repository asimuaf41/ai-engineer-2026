import type { ReactNode } from "react";
import { ViewTransition } from "react";

// Maps a navigation type (set by <Link transitionTypes>) to a CSS class in @repo/ui's transitions.css.
// Links without a type use "page-fade".
const PAGE = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-fade" };

// Wrap the content of each page.tsx, NOT the layout: layouts stay mounted, so they never enter or exit.
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={PAGE} exit={PAGE} default="none">
      {children}
    </ViewTransition>
  );
}
