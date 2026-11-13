# Shipwright: PRD v1

Build plan for Days 14–25. Evidence is in `validation.md`, prices are in `pricing.md` (and `apps/shipwright/src/lib/pricing.ts`).

## Problem & gap

Founders ship apps built with Lovable, Bolt, v0 or Cursor without a security review. Free scanners list findings but leave the fix to
the founder. Human audits cost $199–$1,499 and don't watch after launch.
**The gap:** nobody proves a problem, fixes it with a pull request the founder can review, and keeps watching, in a way a
non-engineer can use.

## Users

| | Solo non-technical founder | Agency dev who inherited a vibe-coded app |
|---|---|---|
| Situation | Built the app with an AI tool, about to launch or just launched | A client handed over an app nobody fully understands |
| Pain | "Is it safe? I can't tell, and I can't read the code." | "I'm responsible for it now. I need to find what's broken fast." |
| Wants | A clear score, proof, and a fix they can approve | A report and PRs they can review and send to the client |
| Buys | Free scan → Fix Pack | Fix Pack → Guardian (3 seats) |

## Jobs to be done

| When... | I want to... | So I can... |
|---------|--------------|-------------|
| I'm about to launch | know if my app is safe | launch without fear |
| A scanner says "exposed key" | see proof it is real | decide what to fix first |
| I know the problem | get the fix as a pull request | approve it without writing code |
| I keep shipping | be told when something breaks | not re-check by hand |

## MVP scope

| Feature | Day | Done when |
|---------|-----|-----------|
| Auth, orgs, GitHub App, Supabase OAuth, encrypted tokens | 14 | A user signs in, creates an org, connects a repo and a Supabase project; tokens are stored encrypted and never shown |
| Code ingestion and pgvector index | 15 | A connected repo is read and indexed; a re-run only reads changed files |
| Audit agents: security, RLS, performance, AI cost | 16 | One scan returns findings that all pass a Zod schema (title, severity, file, evidence) |
| Proof with live checks | 17 | Each top finding shows evidence (a redacted request/response or rule), and we only test apps the user owns |
| Fix PRs with human approval | 18 | A PR opens only after the user clicks Approve; nothing is merged by us |
| Durable jobs and live progress | 19 | A scan survives a restart and the user sees live steps |
| Founder dashboard (web + mobile, one API) | 20 | Score, findings and PR status show on web and in the app from the same API |
| Stripe: Fix Pack, Guardian, Expert quote | 21 | A test payment changes the org's `plan`; the mobile app only links to the web |
| Evals and observability | 22 | A golden set runs on every change; cost per scan and errors are visible |
| SEO pages | 23–24 | Public pages point to the free scan; TODO: how many pages |
| Guardian on every push, launch | 25 | A push to main triggers a check and an alert; the site is live |

## Non-goals (v1)

| We will not... | Why |
|----------------|-----|
| Build our own code editor | We open PRs in the user's repo |
| Sell on mobile | Store rules; the app only links to the web |
| Merge anything without approval | Wrong fixes must never reach production on their own |
| Support every language and framework | v1 targets apps from Lovable, Bolt, v0 and Cursor (TypeScript, Supabase) |
| Replace a full pentest or compliance audit | We find and fix common problems; we don't certify |
| Train models on customer code | Trust (see below) |
| Run attacks against apps the user doesn't own | Legal and ethical |

## Trust & data

| Rule | How |
|------|-----|
| Least privilege | GitHub App asks only for the permissions each feature needs; Supabase access is read-only unless a fix needs more |
| Tokens are secret | Stored in Supabase Vault (encrypted), never logged, never sent to the browser or the app |
| No training on customer code | Provider settings and contracts say so; we say it on the site |
| Delete on request | One action removes the org's code, index, findings and tokens |
| Evidence is redacted | Keys, tokens and personal data are masked before they are saved or shown |
| Ownership first | Live checks run only after the user proves they own the app |

## Success metrics

| Metric | Target | Measured by |
|--------|--------|-------------|
| Activation | First scan finished. TODO: target % of sign-ups | Events from Day 19 jobs |
| Free → paid | TODO: target % (decide after interviews) | Stripe (Day 21) |
| False-positive rate | Under 10% on the golden set | Evals (Day 22) |
| Cost per scan | TODO: set after Day 22; must stay well under the plan price | Observability (Day 22) |

## Risks & mitigation

| Risk | Mitigation |
|------|------------|
| **Prompt injection** from repo files (a README or comment tells the agent to leak data or run commands) | Treat repo text as data, never as instructions; agents get read-only tools; no secrets in prompts; Zod-validate outputs; human approval before any write |
| **GitHub rate limits** | Cache and diff files, queue jobs (Day 19), back off, read only changed files |
| **Wrong or harmful fixes** | Always a PR with human approval; show the proof and a test; re-scan after the fix; never auto-merge |
| **False positives** lose trust | Golden set and the under-10% target; show evidence for every top finding |
| **Cost per scan too high** | Index once, scan changed files, cap per plan (fair use), track on Day 22 |
| **Scanning an app the user doesn't own** | Ownership check before any live check |
| **Founders don't connect their repo** | Free scan works from a URL first (open question) |

## Open questions (answer in interviews)

| Question | Why it matters |
|----------|----------------|
| Will founders connect GitHub and Supabase, or only paste a URL? | Decides how much of the free scan can run without access |
| Do $149 and $39 feel low, fair or high next to what they paid before? | Tests `pricing.md` |
| Fix once or watch monthly: which do they pay for? | Fix Pack vs Guardian |
| Who approves the purchase (founder, client, agency)? | Seats and billing |
| Which tools do they use most (Lovable, Bolt, v0, Cursor)? | What to support first |
| What do they do today after a scare? | Our real competitor |
