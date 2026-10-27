import type { Metadata } from "next";
import { Suspense } from "react";
import { AskChat } from "@/components/ask/ask-chat";
import { ReportSummary, ReportSummarySkeleton } from "@/components/ask/report-summary";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Ask Shipwright",
};

export default function Page() {
  return (
    <PageTransition>
      <main className="container-page grid grid-cols-1 gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden pt-8 lg:block">
          <div className="sticky top-22">
            <Suspense fallback={<ReportSummarySkeleton />}>
              <ReportSummary />
            </Suspense>
          </div>
        </aside>
        <div className="mx-auto w-full max-w-3xl">
          <AskChat />
        </div>
      </main>
    </PageTransition>
  );
}
