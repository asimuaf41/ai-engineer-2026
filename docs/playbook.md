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
