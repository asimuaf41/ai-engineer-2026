import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { AppTopbar } from "@/components/dashboard/app-topbar";
import { getCommandIssues } from "@/lib/dashboard/data";

// The dashboard is private: keep every page under it out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppLayout({ children }: { children: ReactNode }) {
  // Not awaited on purpose: the shell renders right away and the palette's issue list streams in.
  const commandIssues = getCommandIssues();

  return (
    <NuqsAdapter>
      <div className="flex min-h-dvh">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar commandIssues={commandIssues} />
          <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8"
          >
            {children}
          </main>
        </div>
      </div>
    </NuqsAdapter>
  );
}
