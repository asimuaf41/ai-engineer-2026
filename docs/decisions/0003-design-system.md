# 0003 — Design system

Date: 2026-10-23 · Status: Accepted

## Context

- Two apps (`shipwright`, `lab`) must look like one product and share UI.
- Clients will want rebrands, so colors and fonts must change in one place.
- Dark mode is expected, and accessibility (contrast, labels, focus) is a client requirement.

## Decision

- **Components:** shadcn/ui on Radix, living in `@repo/ui` (`packages/ui/src/components`), style `radix-nova`.
  Apps import `@repo/ui/components/*`; inside the package we use `#components/*`, `#lib/*`, `#hooks/*`.
- **Tokens:** OKLCH semantic tokens (`--background`, `--brand`, `--critical`, ...) in one file,
  `packages/ui/src/styles/globals.css`. It also holds fonts, radius, the type scale and the `@source` lines
  (this replaces the per-app `@source` trade-off in ADR 0002). Components use tokens, never raw colors.
- **Dark mode:** `next-themes`, class strategy, defaults to the system setting.
- **Fonts:** Geist Sans and Mono through the `geist` package.
- **Contrast:** `pnpm --filter @repo/ui check-contrast` checks WCAG pairs for light and dark.
- **Hook rule 4:** no raw color classes (`zinc-*`, `white/*`, ...) in app `.tsx`. Planned: today `repo-rules.mjs`
  only enforces rules 1-3 (model ids, public secrets, catalog versions), so this is still a convention.

## Alternatives rejected

- **MUI / Chakra:** we would not own the code, and restyling means fighting the library.
- **Base UI as the engine:** fine, but we keep one engine and Radix has far more examples to learn from.
- **`tailwind.config.js`:** not needed in Tailwind v4; the theme lives in CSS.

## Consequences

- We own the component code, so we also own its updates: use `shadcn add <name> --diff` and review.
- `badge.tsx` contains our severity variants. Never re-add it with `--overwrite`.
- The contrast script blends colors in sRGB, but the browser mixes in OKLab, so tinted results can differ slightly.
  Treat ratios near 4.5 as risky.
