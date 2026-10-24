# 0004 — Motion and page transitions

Date: 2026-10-24 · Status: Accepted

## Context

Shipwright should feel premium: lists that re-flow smoothly, pages that don't blink. It must stay
accessible (people who ask their OS for less motion get less motion), keep Server Components as
the default, and not bloat the client bundle.

## Decision

- **In-page animation:** Motion 14, imported from `motion/react` (`motion/react-client` in Server Components).
- **Tokens:** durations, easings and springs live only in `@repo/ui/lib/motion`.
- **Building blocks:** animated components live in `@repo/ui/motion` (`Reveal`, `Stagger`,
  `SegmentedControl`, `AnimatedNumber`, `MotionProvider`).
- **Page transitions:** React `<ViewTransition>` (wrapping each page, not the layout) plus
  `<Link transitionTypes>` for forward and back direction. No Next config is needed on 16.4.
- **Reduced motion:** `MotionConfig reducedMotion="user"` in both apps, `useReducedMotion()` for
  `useSpring`/`useAnimate` code, and a `prefers-reduced-motion` guard in `transitions.css`.
- **Guardrail:** hook rule 5 blocks `framer-motion` imports and the deprecated `staggerChildren`.
- **Security upgrade (separate from this feature):** Next.js 16.4.0 → 16.4.2. `pnpm audit --prod`
  flagged the old version (GHSA-673q-mjm6-r5xr, critical: remote code execution in `use cache`;
  GHSA-p3m5-59mp-jv5r, high: denial of service in Server Actions). It reports no advisories after the bump.

## Alternatives rejected

- **CSS only:** great for hover and focus, but it can't animate an element being removed or a grid re-flowing.
- **GSAP:** excellent for timelines, but imperative and heavier for React UI state.
- **`AnimatePresence` in `template.tsx` or a FrozenRouter:** no real exit animation, or it relies on private Next APIs.
- **Motion's `AnimateView`:** nice, but plain `<ViewTransition>` is enough today.

## Consequences

- Durations exist in two places, TypeScript (`lib/motion.ts`) and CSS (`styles/transitions.css`).
  Keep them in sync by hand; CSS can't import TypeScript.
- Motion adds roughly 30-40 kB of client JavaScript. `LazyMotion` is the next step if bundle size matters.
- Browsers without View Transitions (for example Firefox today) navigate instantly, which is a safe fallback.
