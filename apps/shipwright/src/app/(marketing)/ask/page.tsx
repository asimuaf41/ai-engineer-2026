import type { Metadata } from "next";
import { Suspense } from "react";
import { AskChat } from "@/components/ask/ask-chat";
import { ReportSummary, ReportSummarySkeleton } from "@/components/ask/report-summary";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Ask Shipwright",
  description: "Ask questions about your production report in plain English and get answers with the evidence behind them.",
};

export default function Page() {
  return (
    <PageTransition>
      <div className="container-page grid grid-cols-1 gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
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
      </div>
    </PageTransition>
  );
}
