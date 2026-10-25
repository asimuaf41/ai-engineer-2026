# 0005 — Scroll storytelling

Date: 2026-10-25 · Status: Accepted

## Context

The landing page has to explain Shipwright in one scroll: find, prove, fix, guard. It must keep LCP
fast, work on phones, and stay comfortable for people who ask their OS for less motion.

## Decision

- **Scroll-linked values:** Motion `useScroll` and `useTransform` give MotionValues that are bound with
  `style`. They update the DOM directly, with no React render per frame.
- **Hero:** the `h1` and intro copy are server HTML, visible on first paint. Only the product shot
  (`HeroShot`) animates.
- **Shared pieces:** `ScrollProgress` and `Parallax` live in `@repo/ui/motion`. The story itself is app code
  (`how-it-works.tsx`).
- **Sticky story on `lg` and up only.** Phones get a plain stack with the picture under each step.
- **Active step:** `useMotionValueEvent` calls `setActive` on every frame, but React skips the re-render
  unless the step changed. The rail fill stays a MotionValue.
- **Reduced motion:** parallax and tilt are switched off with `useReducedMotion()`. The progress bar and
  rail follow the user's own scroll 1:1, so they stay.
- **Guardrail:** hook rule 6 blocks `addEventListener("scroll")` and `overflow-x-hidden` (which breaks sticky).

## Alternatives rejected

- **CSS `animation-timeline`:** great and zero JavaScript, but not in stable Firefox yet, and it can't tell
  React which step is active. We may use it for optional decoration only.
- **GSAP ScrollTrigger:** powerful timelines and pinning, but imperative, and an extra library for what
  Motion already does.
- **Scroll-jacking or fullpage libraries:** users lose control of their own scroll.
- **Video or Lottie hero:** megabytes, blurry text, and it goes stale when the product changes.

## Consequences

- The picture is markup, so it must be updated by hand when the product changes.
- Each story visual is in the DOM twice (phone stack and sticky column). Both copies are `aria-hidden`.
- Measured: LCP 0.36 s with 4× CPU throttling; 47 renders with `useState` per scroll event vs 6 with the
  MotionValue approach.
- Browsers without scroll-timeline support are unaffected, because nothing here depends on it.
