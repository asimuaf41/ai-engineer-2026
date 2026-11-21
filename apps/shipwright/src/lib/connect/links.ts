// The addresses the connect page uses, and where "Try again" should go. Pure code, so it can be tested.
import type { ConnectError } from "./errors.ts";
import type { ConnectState } from "./state.ts";

export type ConnectHrefs = {
  // This page itself (to look again).
  page: string;
  // Routes that redirect to GitHub or Supabase. They are plain page loads, never client-side links.
  githubConnect: string;
  supabaseConnect: string;
  // Goes to step 3 without saving anything.
  skip: string;
};

// `slug` is encoded, so a odd value (like "a/b?x") can never change the path or add a query.
export function connectHrefs(slug: string): ConnectHrefs {
  const encoded = encodeURIComponent(slug);
  const page = `/o/${encoded}/connect`;
  return {
    page,
    githubConnect: `/api/github/install?org=${encoded}`,
    supabaseConnect: `/api/supabase/connect?org=${encoded}`,
    skip: `${page}?step=ready`,
  };
}

// "Try again" starts the right step again. A plain member cannot connect anything, so they only look again.
// null = trying again would not help yet (for example, a feature that isn't switched on).
export function retryHrefFor(error: ConnectError | null, state: Pick<ConnectState, "canManage" | "active">, hrefs: ConnectHrefs): string | null {
  if (!error || error.retry === "none") return null;
  if (!state.canManage) return hrefs.page;
  const step = error.retry === "current" ? state.active : error.retry;
  if (step === "github") return hrefs.githubConnect;
  if (step === "supabase") return hrefs.supabaseConnect;
  return hrefs.page;
}
