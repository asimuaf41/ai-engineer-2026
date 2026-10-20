---
name: new-experiment
description: Scaffold a new numbered AI Lab experiment page in apps/lab. Use when Asim asks for a new Lab experiment, demo page or prototype.
argument-hint: "[slug] [what the experiment should do]"
---

# New Lab experiment

Slug: $0

Request: $ARGUMENTS

## Current experiments

!`cat apps/lab/src/experiments.ts`

## Steps

1. **Pick the id and folder.** Take the highest `id` in the list above and add 1, as a two-digit
   string (for example "01" becomes "02"). The folder is `apps/lab/src/app/experiments/<id>-<slug>/`.
2. **Plan first.** Show a short plan (files to create, what the UI does, what the API route
   takes and returns). Wait for Asim to approve before writing any file.
3. **`page.tsx` is a Server Component.** It shows the label "AI Lab · experiment <id>", an `h1`,
   one sentence about the experiment, and an exported `metadata` object.
4. **Interactive UI goes in one `"use client"` file** next to the page (for example
   `<name>-form.tsx`). Keep it as small as possible; the page itself stays a Server Component.
5. **Pure logic goes in `apps/lab/src/lib/<name>.ts`** (no React, no browser APIs), so it is easy to test.
6. **Claude is called only from a route handler**, never from the browser. Copy the pattern in
   `apps/lab/src/app/api/audit/route.ts`: parse JSON safely, validate with Zod, return 400 with a
   friendly message for bad input and 502 with a generic message when Claude fails (log the real
   error on the server). Use `claude` from `@/lib/claude` and the model from `MODELS`.
   Never write a model id string.
7. **Register it.** Add a new entry (`id`, `title`, `href`, `summary`) to `EXPERIMENTS` in
   `apps/lab/src/experiments.ts`, so it shows up in the Lab nav.
8. **Every UI has loading, error and empty states**, every input has a label, and you use
   `Button` and `Card` from `@repo/ui` first. Error messages use `role="alert"`.
9. **Check.** Run `pnpm --filter lab check-types` and fix the root cause of any error
   (no `any`, no `@ts-ignore`).
10. **Finish** with the URL to open (for example `http://localhost:3001/experiments/<id>-<slug>`)
    and a "What to review" list of 3-5 items for Asim, in simple English.
