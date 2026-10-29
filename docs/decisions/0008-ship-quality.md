# 0008 — Ship quality: speed, accessibility, previews

Date: 2026-10-29 · Status: Accepted

## Context

Demo links go into proposals (Upwork, LinkedIn, WhatsApp, Slack). They must load fast on phones, show a
real preview card when pasted, and be accessible. EU accessibility law (the European Accessibility Act)
makes accessibility a requirement for many EU customers, not a nice-to-have.

## Decision

- **Speed:** a Lighthouse 13 script (`pnpm lh`) with per-page budgets, median of 3 runs, mobile by default,
  against a production build. Performance 90 on `/` and `/demo`, 85 on `/ask`, 80 on `/dashboard`;
  accessibility and best practices 95 everywhere; SEO 95 on marketing pages only. It exits 1 below budget.
- **Accessibility:** axe in Playwright on every public page in light, dark and phone (WCAG 2.0 to 2.2, A and AA),
  plus a keyboard test (skip link, then focus on `<main>`). Fix the cause in components; never disable a rule.
- **Previews and SEO:** the Metadata API (title template, per-page description, canonical), a generated Open Graph
  image (`next/og`, 1200x630), `sitemap.ts` and `robots.ts`. App pages are `noindex` and disallowed.
- **Analytics:** Vercel Speed Insights and Analytics, only when deployed on Vercel. Not wired in code yet.
- **Demo:** a scripted recording (Playwright plus ffmpeg, `pnpm demo:record`) that produces an MP4 and a GIF.
- **Guardrail:** hook rule 9 blocks `priority` on `next/image` (deprecated in Next 16) and raw `<img>`.
- **Repeatable:** the `/audit-site` skill runs the whole checklist and only reports.

## Alternatives rejected

- **@lhci/cli:** still Lighthouse 12.
- **One-off manual Lighthouse runs:** no safety net; a regression ships unnoticed.
- **Unlighthouse:** good for big sites, overkill for 4 pages.
- **A static OG PNG:** goes stale when the product changes.

## Consequences

- Measured on 2026-10-29 on Asim's machine (production build, mobile, median of 3): `/` and `/demo` both score
  100 for performance, accessibility, best practices and SEO, with LCP 0.9 s, CLS 0 and TBT 50 ms. The
  legacy JavaScript Insight still estimates about 14 KiB of savings; not investigated yet.
- **No before/after yet:** `docs/perf-baseline.md` was not in the repo when this was written. Add the baseline
  there and update this section.
- The first axe run found two real problems (faded text in "How it works" failed contrast; a 16 px checkbox was
  below the 24 px target size) and one test flake from half-faded elements. The test now waits for animations to finish.
- Scores depend on the machine: a slower laptop or the deployed site can score lower, so budgets are checked locally.
- Automatic checks cannot judge keyboard flow beyond the skip link, whether alt text makes sense, or real-user data.
- If `NEXT_PUBLIC_APP_URL` is missing in production, previews silently point at localhost.
- The demo video has no mouse cursor, and the numbers in the OG image are static copy.
