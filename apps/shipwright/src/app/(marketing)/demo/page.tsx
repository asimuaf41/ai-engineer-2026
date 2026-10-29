import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { IssueBoard } from "@/components/issue-board";
import { PageTransition } from "@/components/page-transition";
import { SAMPLE_ISSUES } from "@/lib/sample-issues";

export const metadata: Metadata = {
  title: "Live production report",
  description:
    "See a real production report: the security, database and payment problems Shipwright found in a sample AI-built app, and how each one gets fixed.",
};

export default function Page() {
  const fixed = SAMPLE_ISSUES.filter((issue) => issue.status === "fixed").length;

  return (
    <PageTransition>
      <div className="container-page pb-24">
        <header className="flex flex-col gap-3 py-12">
          <Link
            href="/"
            transitionTypes={["nav-back"]}
            className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon aria-hidden className="size-4" />
            Home
          </Link>
          <p className="font-mono text-sm tracking-wider text-brand uppercase">Demo report · acme/checkout-app</p>
          <h1 className="text-h1 font-semibold">
            {SAMPLE_ISSUES.length} problems found, {fixed} already fixed
          </h1>
          <p className="max-w-prose text-muted-foreground">
            This is what a Shipwright report looks like. Click “Open fix PR” on any problem and watch your production
            score go up.
          </p>
        </header>

        <IssueBoard initialIssues={SAMPLE_ISSUES} />
      </div>
    </PageTransition>
  );
}
