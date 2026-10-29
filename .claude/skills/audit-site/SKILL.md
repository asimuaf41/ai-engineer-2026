---
name: audit-site
description: Audit a Next.js app for performance, accessibility, SEO and share previews, and report before/after numbers.
argument-hint: "[app folder] [base url]"
allowed-tools:
  - Bash(pnpm *)
  - Bash(curl *)
  - Bash(node *)
---

# Audit site

Audit $ARGUMENTS.

The first word is the app folder (default `apps/shipwright`). The second word, if given, is the real
public URL of the site (for example `https://example.com`). Never read or print `.env` files.

Do the steps in order. **Stop at the first failure**, say what went wrong in simple English, and do not
continue (but still do step 6 so no server is left running). A page that scores *below budget* is a
result to report, not a failure; a crash, a 404 or a runtime error is a failure.

## Steps

1. **Build and start.** Run a production build of the app (`pnpm --dir <folder> build`; use
   `SKIP_ENV_VALIDATION=1` when there are no real keys, and when a base url is given also set
   `NEXT_PUBLIC_APP_URL` to it, so previews are checked the way production will serve them). Then start it
   on port 3200 in the background (`pnpm --dir <folder> exec next start --port 3200`) and wait until
   `http://localhost:3200/` answers 200. Remember how to stop it.
2. **Measure.** Run the app's Lighthouse script against `http://localhost:3200`
   (`pnpm --dir <folder> exec node scripts/lighthouse.mjs http://localhost:3200`).
   - If the app has no such script, copy `apps/shipwright/scripts/lighthouse.mjs` into it and set `PAGES`
     from the app's routes (every static `page.tsx`, skipping `api/` and dynamic `[param]` routes). This is
     the **only file this skill may add**; say so in the report.
   - Then, if the app has an `e2e/` folder and a `test:e2e` script, run `pnpm --dir <folder> test:e2e`.
3. **Check the share preview and crawl files.** With `curl`: `/robots.txt`, `/sitemap.xml`, and the
   `<meta property="og:image">` tag in the home page HTML. The og:image must be an absolute URL, and when a
   base url was given it must be `https://` on that host. Also request the image itself (status 200,
   `content-type: image/*`) by swapping the host for `localhost:3200`.
4. **Read the Insights.** Take the worst page from the Lighthouse table. Open
   `<folder>/reports/lighthouse/<page>.html` with `node`, read the JSON in `window.__LIGHTHOUSE_JSON__`, and
   list every audit and Insight with a score below 1: its name, the number it shows, and the LCP element.
5. **Report.**
   - A score table: page, performance, accessibility, best practices, SEO, LCP, CLS, TBT, and the a11y test result.
   - The top 5 problems, ranked by impact, each with the file and a suggested fix.
   - What cannot be checked automatically: keyboard use beyond the skip link, whether alt text is meaningful,
     real-user data (field Core Web Vitals), and how it looks on a real phone.
6. **Stop the server** you started on port 3200.

**Never change code.** This skill only reports (the one exception is the copied Lighthouse script in step 2).
