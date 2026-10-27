// Report summary for the Ask page sidebar. Demo data until real scans arrive on Day 13.
import "server-only";
import { connection } from "next/server";
import { productionScore, SAMPLE_ISSUES } from "@/lib/sample-issues";

export async function getReportSummary() {
  // Opt in to per-request rendering, so the loading skeleton really shows.
  await connection();
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    repo: "acme/checkout-app",
    score: productionScore(SAMPLE_ISSUES),
    scannedAgo: "2 hours ago",
    openIssues: SAMPLE_ISSUES.filter((issue) => issue.status === "open").map(({ id, title, severity }) => ({
      id,
      title,
      severity,
    })),
  };
}
