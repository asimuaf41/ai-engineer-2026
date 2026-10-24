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
