---
paths: ["packages/ui/**"]
---

# packages/ui rules

## Motion

- Animated building blocks live in `src/motion/` (`"use client"`) and are imported as
  `@repo/ui/motion/<name>`. Durations, easings and springs come from `#lib/motion` only.
- Animate transform and opacity only. Use the `layout` prop for size or position changes.
- Every `AnimatePresence` child has a stable unique `key` (an id, never the index).
- Respect reduced motion: `MotionProvider` covers motion components; check `useReducedMotion()`
  for `useSpring` / `useAnimate` code.
- Scroll effects use `useScroll` / `useTransform` MotionValues bound with `style`, never `useState`.
- Anything bound with `style` (parallax, tilt) checks `useReducedMotion()`; a progress bar that
  moves 1:1 with the scroll may stay on.

## AI UI

- AI components live in `src/ai/` and stay provider-agnostic: no imports from `ai` or `@ai-sdk/*`.
- Streamed text is rendered only through `Response` — never raw HTML.
- Anything animated checks reduced motion.
- No `aria-live` on streaming text (it makes screen readers re-read every token).
