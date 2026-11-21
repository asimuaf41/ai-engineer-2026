import type { Metadata } from "next";
import type { ReactNode } from "react";

// Signed-in pages: never in search results. Each page brings its own header and its own <main id="main">
// (the skip link's target), because the workspace pages have a different top bar from the "create a workspace" page.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return children;
}
