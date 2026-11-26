// What the connect page shows, as plain data. The page builds this from the database and GitHub/Supabase, and the
// components only draw it. Keeping the "which step is open?" logic here means it can be tested without a browser.
import type { ConnectErrorCode } from "./errors.ts";

export type Role = "owner" | "admin" | "member";

export type RepoOption = {
  fullName: string;
  private: boolean;
  defaultBranch: string;
  pushedAt: string | null;
};

export type ProjectOption = {
  ref: string;
  name: string;
  region: string;
  status: string;
};

// Step 1. "connected" means a repository has been chosen. The installation alone is "pick_repo" or "no_repos".
export type GitHubStep =
  | { status: "coming_soon" }
  | { status: "not_connected" }
  | { status: "pending_approval" }
  | { status: "no_repos"; installUrl: string }
  | { status: "pick_repo"; repos: RepoOption[]; installUrl: string }
  | { status: "connected"; repo: { appId: string; fullName: string; defaultBranch: string }; installUrl: string }
  | { status: "needs_reconnect" }
  | { status: "error"; code: ConnectErrorCode };

// Step 2 (optional). "connected" means a project has been chosen.
export type SupabaseStep =
  | { status: "coming_soon" }
  | { status: "not_connected" }
  | { status: "no_projects" }
  | { status: "pick_project"; projects: ProjectOption[] }
  | { status: "connected"; project: { ref: string; name: string; region: string } }
  | { status: "needs_reconnect" }
  | { status: "error"; code: ConnectErrorCode };

export type StepState = "done" | "active" | "upcoming" | "skipped";

export type ConnectInput = {
  role: Role;
  github: GitHubStep;
  supabase: SupabaseStep;
  // True when the person pressed "Skip for now" (the link is ?step=ready, so nothing is saved).
  skipSupabase: boolean;
};

export type ConnectState = {
  // Only owners and admins can connect, choose or disconnect. Members see the same cards, read-only.
  canManage: boolean;
  github: StepState;
  supabase: StepState;
  ready: StepState;
  active: "github" | "supabase" | "ready";
};

export function deriveConnectState(input: ConnectInput): ConnectState {
  const canManage = input.role === "owner" || input.role === "admin";

  // Step 1 is required. Until a repository is chosen, nothing else opens.
  if (input.github.status !== "connected") {
    return { canManage, github: "active", supabase: "upcoming", ready: "upcoming", active: "github" };
  }

  // Step 2 is optional: it opens only while the person can still do something about it.
  const supabaseDone = input.supabase.status === "connected";
  const supabaseUnavailable = input.supabase.status === "coming_soon";
  if (!supabaseDone && !input.skipSupabase && !supabaseUnavailable) {
    return { canManage, github: "done", supabase: "active", ready: "upcoming", active: "supabase" };
  }

  return { canManage, github: "done", supabase: supabaseDone ? "done" : "skipped", ready: "active", active: "ready" };
}
