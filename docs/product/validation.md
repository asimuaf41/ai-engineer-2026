# Shipwright: validation kit

## Problem

Founders build whole apps with AI tools (Lovable, Bolt, v0, Cursor) and ship them without a security review.
In one 2026 scan of 101 AI-built apps, 68% had a security issue, and about 1 in 4 exposed the Supabase service-role key.
Today a founder either gets a list of findings with no fix, or pays for a human audit.

## Evidence

| Evidence | What it shows | Source | Date | Written by a competitor? |
|----------|---------------|--------|------|--------------------------|
| Public data: a scan of 101 AI-built apps found 68% with a security issue; about 1 in 4 exposed the Supabase service-role key | The problem exists | TODO: name and link of the scan | 2026 | TODO: check who wrote it |
| Public data: CVE-2025-48757, missing RLS in many Lovable apps | The problem exists | CVE-2025-48757 (public CVE record) | 2025 | No |
| People talking: posts like "my Lovable app got hacked" and "how do I fix RLS" on Reddit, Indie Hackers and X | People feel it | TODO: 3 links | TODO | No |
| People paying: manual audits sell for $199–$1,499; "vibe code rescue" for $15K+ | People pay for it (strongest) | TODO: links to the audit and rescue offers | TODO | Yes, probably: agencies sell these. TODO: confirm |

"Yes" rows are marketing. Treat them as a hint, not proof. The "paying" row is the strongest evidence, so it is the first to double-check.

## Competitor map

| Who | What they do | Proves the issue? | Fixes it (PR)? | Watches after launch? | Price |
|-----|--------------|-------------------|----------------|-----------------------|-------|
| Free URL/repo scanners (VibeCheck, amihackable, Vibe Scan…) | Scan a URL or repo, list findings | Rarely | No, they give you a prompt to paste | No | Free |
| Paid scanners (e.g. Vibe App Scanner) | URL + code scan, fix instructions | Partly | No | Pro tier | $5–$29/month |
| Dev security platforms (Aikido, Snyk…) | SAST, dependencies, secrets for dev teams | No | Some auto-fix, built for engineers | Yes | Free tier, then team pricing |
| Built into the platform (Lovable security scan, Supabase Security Advisor) | Checks on publish / in the dashboard | No | Lovable: "try to fix" with credits | On publish | Free |
| Manual audits / agencies | A human reads the code | Yes | Sometimes, by hand | No | $199–$1,499 small audits, $3,400+ pentests, $15K+ rescues |

Source and date for this table: TODO (where and when you collected it).

## The gap

Nobody proves a problem, fixes it with a pull request the founder can review, and keeps watching after launch, in a way a founder who isn't an engineer can use.

## Positioning

For **founders who build with Lovable, Bolt, v0 or Cursor** who **don't know if their app is safe to launch**, Shipwright **proves each security problem and opens a pull request to fix it**, unlike **free scanners that hand you a prompt to paste, and human audits that cost $199–$1,499**.

## Riskiest assumptions

| # | We assume that... | How I test it this week |
|---|-------------------|-------------------------|
| 1 | Founders worry about security before launch, not only after something goes wrong. | Ask the interview questions below to TODO: N founders. Count how many did something about security before launch. |
| 2 | They will pay for a fix, not just a report. Today free scanners already give a list. | Ask what they paid last time (money or time). Offer one real fix on one real app and see if they say yes. |
| 3 | They will give a scanner access to their code or app. | Offer a scan of a public URL first. Note who agrees, and who asks for a read-only link or says no. |

## Interview script

Rules: ask about the past, not the future. Never say "would you use". Let them talk. Write down their exact words.

1. Tell me about the last app you shipped. What did you build it with?
2. Before you launched it, what did you do about security? (If nothing, why not?)
3. When did you last worry that something in your app was unsafe? What was it?
4. What did you do about it? Who did you ask, and what did it cost you (time or money)?
5. What did you try that did not work?

Close with: "Who else built something like this that I should talk to?"

### DM to send (about 60 words)

> Hi TODO: name. I saw you built TODO: app with TODO: Lovable / Bolt / v0 / Cursor. Nice work. I'm researching how founders handle security before launching AI-built apps. I'm not selling anything. Could I ask you 5 short questions about what you did on your last launch? 15 minutes, by chat or call. Happy to share what I learn afterwards.

Send on X, LinkedIn and Indie Hackers. Change the first two lines for each person.

## Interview notes

| Date | Who | Built with | Last security worry | What they did | What they paid | Quote |
|------|-----|------------|---------------------|---------------|----------------|-------|
|      |     |            |                     |               |                |       |
|      |     |            |                     |               |                |       |
|      |     |            |                     |               |                |       |
