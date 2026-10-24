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
