# Playbook

## Design system

Tokens only: if a color, font, radius or text size is not a token, it does not go in a component.
Decision and reasons: [ADR 0003](decisions/0003-design-system.md).

**Where tokens live:** `packages/ui/src/styles/globals.css`. Both apps import it; never add colors in an app.

**Add a token (4 steps)**
1. Add `--name` (and `--name-foreground` if it holds text) to `:root` and `.dark`, as OKLCH.
2. Map it in `@theme inline` as `--color-name: var(--name)` so `bg-name` / `text-name` work.
3. Add its pairs to `scripts/check-contrast.mjs` and run `pnpm --filter @repo/ui check-contrast`.
4. Show it on `/design` in `apps/shipwright`.

**Add a component:** run the CLI from `packages/ui`: `pnpm dlx shadcn@latest add <name>`.
Use `--diff` for components that already exist, and never `--overwrite` `badge.tsx`.
Check the imports afterwards: `cn` must come from `#lib/utils`.

**6 AI UI mistakes to catch** (reconstructed from today's work)
1. **Raw colors** (`bg-zinc-950`, `text-red-300`) instead of tokens. They break dark mode and rebrands.
2. **Color alone** for meaning. Severity needs a word too (see `IssueCard`).
3. **Swapping theme icons in JavaScript.** It causes a hydration mismatch; use CSS `dark:` classes.
4. **Built-up class names** like `` `before:bg-${severity}` ``. Tailwind can't see them; write the full names.
5. **Untested contrast.** A palette that looks fine can fail 4.5:1; run the contrast script.
6. **Wrong or missing imports.** The CLI once pulled in an unrelated npm package named `cn`; check import
   paths and that each package declares what it imports (for example `tailwindcss` in `@repo/ui`).

## Motion

Tokens only: durations, easings and springs come from `@repo/ui/lib/motion`; never type a number or a curve in a component.
Decision and reasons: [ADR 0004](decisions/0004-motion-and-page-transitions.md). Live examples: `/design` → Motion.

**The 4 building blocks** (`@repo/ui/motion/<name>`)
- `Reveal`: fades a block up once when it scrolls into view. Below the fold only.
- `Stagger` + `StaggerItem`: a list whose children fade up one after another.
- `SegmentedControl`: a single-choice pill toggle with a sliding highlight.
- `AnimatedNumber`: counts up to a value when it scrolls into view.

**Which tool?**

| Need | Use | Why |
|---|---|---|
| Hover, focus, color change | CSS | Free and fast; no JavaScript. |
| Enter/exit, list re-flow, springs, gestures | Motion | CSS can't animate removal or layout changes. |
| Moving between pages | `<ViewTransition>` + `Link transitionTypes` | The browser animates the route change; wrap each page, not the layout. |

**8 AI animation mistakes to catch** (reconstructed from today's work)
1. **Animating width, height, top or left.** Animate transform and opacity; use the `layout` prop for size and position changes.
2. **CSS `transition-all` on an element Motion drives.** The two fight over `transform` (the Button needed `transition-colors`).
3. **Importing `framer-motion` or using `staggerChildren`.** Both are outdated; use `motion/react` and `delayChildren: stagger(n)`. A hook blocks them.
4. **Stale closures on exiting cards.** An exiting `AnimatePresence` child keeps old props, so update state with `setX(current => …)`.
5. **Missing or index keys under `AnimatePresence`.** Use a stable id, and key the empty state too.
6. **Reduced-motion gaps.** `MotionConfig` doesn't cover `useSpring` or `useAnimate`; check `useReducedMotion()`.
7. **Wrapping the hero headline in `Reveal`.** Starting at opacity 0 delays LCP.
8. **Hardcoded durations and curves.** Put them in `lib/motion.ts` (and keep `transitions.css` in sync).

## Scroll

Decision and reasons: [ADR 0005](decisions/0005-scroll-storytelling.md). Live example: the "How it works" story on `/`.

**The 4 tools**
- `useScroll`: gives `scrollYProgress`, a 0→1 MotionValue for the page or for one element (`target`).
- `useTransform`: maps that progress to a value (rotate, scale, offset) you bind with `style`.
- `useMotionValueEvent`: runs code on every change; use it only to set state when something discrete changes (the active step).
- CSS `animation-timeline`: zero JavaScript, but not in stable Firefox. Decoration only.

**Reading `offset`:** it is two moments, `[when progress is 0, when progress is 1]`, each written as
`"<point on the element> <point on the screen>"`. `["start center", "end center"]` means: 0 when the top of the
element reaches the middle of the screen, 1 when its bottom does.

**2 sticky rules**
1. The sticky column's parent must be tall: grid items stretch, so never add `items-start`.
2. No ancestor may have `overflow` hidden or auto (use `overflow-x-clip`), and phones get a plain stack.

**8 AI scroll mistakes to catch** (reconstructed from the repo rules and today's work)
1. **`addEventListener("scroll")`.** Use `useScroll`; a hook blocks the listener.
2. **`useState` for scroll progress.** It re-renders every frame; bind a MotionValue with `style`.
3. **`overflow-x-hidden` on a wrapper.** It breaks `position: sticky`; use `overflow-x-clip`.
4. **`items-start` on the sticky grid.** The column is only as tall as its content, so sticky has no room.
5. **A bare `grid` around code.** Long lines widen the column on phones; use `grid-cols-1`.
6. **Sticky on phones.** Use the sticky layout from `lg` up and a plain stack below.
7. **Parallax or tilt without `useReducedMotion()`.** Anything moved by `style` needs the check.
8. **Hiding the hero headline or forgetting `scroll-mt-*`.** Animate the product shot, not the `h1`; offset anchors under the sticky header.

## AI UX

AI answers take seconds, so the UI must show it heard you, what it is doing, and how to stop it.
Decision and reasons: [ADR 0006](decisions/0006-ai-native-ux.md). Live example: `/ask` in `apps/shipwright`.

**The 5 patterns**
1. **Instant feedback:** the question appears at once and "Thinking…" shimmers until the first part arrives.
2. **Show the work:** reasoning and tool cards (running, done, error, stopped) instead of one long spinner.
3. **Stream readable text:** only through `Response` (Streamdown), with `throttle` to limit re-renders.
4. **Always stoppable:** a Stop button, and `abortSignal: req.signal` so the model stops too.
5. **Honest states:** a skeleton that matches the real boxes, errors with Retry, optimistic feedback that rolls back.

**AI SDK 7 renames** (hook rule 7 blocks the old names)

| Old (5/6) | Use now (7) |
|---|---|
| `result.toUIMessageStreamResponse()` | `createUIMessageStreamResponse` + `toUIMessageStream` |
| `stepCountIs(n)` / `maxSteps` | `isStepCount(n)` in `stopWhen` |
| `experimental_throttle` | `throttle` |
| `system:` in `streamText` | `instructions:` |

**8 AI-UI mistakes to catch** (reconstructed from today's work)
1. **Rendering model text as raw HTML.** It is untrusted (XSS); use `Response`.
2. **`streamText` without `abortSignal`.** Stop ends the stream in the browser but the model keeps running and billing.
3. **Trusting the browser's message history.** It can include fake tool results; run `safeValidateUIMessages`.
4. **Sending raw errors to the browser.** Show only `ToolUserError` text; mask the rest in `onError`.
5. **`aria-live` on streaming text.** Screen readers re-read every token; announce one short status line instead.
6. **Ignoring reduced motion.** Streamdown's CSS has no rule for it; pass `animated={!useReducedMotion()}`.
7. **Showing an empty "thinking" block.** Claude sends thinking empty unless `display: "summarized"`; hide empty ones.
8. **Enter sending mid-composition.** Check `isComposing` so Urdu and Chinese input methods can confirm a word.

## Dashboards

A dashboard is five jobs. Decision and reasons: [ADR 0007](decisions/0007-dashboards.md). Live example: `/dashboard` and `/dashboard/issues` in `apps/shipwright`.

**The 5 jobs**
1. **See the score at a glance:** KPI cards and a trend chart, with the change written in words, not only color.
2. **Find any issue fast:** table search, filters and sort, plus a Cmd/Ctrl+K palette.
3. **Share a view:** filters, sort and page live in the URL (nuqs), so a link opens the same table.
4. **Never show a blank screen:** skeletons that match the real boxes, and two empty states ("no matches", "nothing yet").
5. **Never show a broken screen:** one boundary per widget, `retry()`, and a reference id on page errors.

**TanStack Table v8 → v9** (hook rule 8 blocks the old names)

| v8 | v9 |
|---|---|
| `useReactTable({ getCoreRowModel: getCoreRowModel() })` | `useTable({ features, columns, data })` |
| `getSortedRowModel()` / `getFilteredRowModel()` / `getPaginationRowModel()` | `createSortedRowModel()` / `createFilteredRowModel()` / `createPaginatedRowModel()` inside `tableFeatures({ … })` |
| Every feature is on | Register each one (`rowSortingFeature`, …); prerequisites first |
| `createColumnHelper<Row>()` | `createColumnHelper<typeof features, Row>()` |

**8 dashboard mistakes to catch** (reconstructed from the repo rules and today's work)
1. **The v8 table API.** Use `useTable` and `create*RowModel()`; a hook blocks the old names.
2. **`reset()` in `error.tsx`.** It only clears the error; `retry()` re-fetches and re-renders.
3. **Hex colors in a chart.** Use `var(--color-<key>)` or `var(--chart-N)` so dark mode follows; a hook blocks hex.
4. **`dangerouslySetInnerHTML` for chart styles.** Set the CSS variables with the `style` prop instead.
5. **`features` or `columns` created inside the component.** Every render rebuilds the row models; keep them at module scope.
6. **"x days ago" or local-time dates in server-rendered text.** The server and browser disagree; use a fixed `timeZone`.
7. **`vector-effect="non-scaling-stroke"` on a path that draws in.** It breaks `pathLength`, so the line just appears.
8. **Re-adding a shadcn component with `--overwrite`.** It erases our edits (chart, command, checkbox, badge, button).
