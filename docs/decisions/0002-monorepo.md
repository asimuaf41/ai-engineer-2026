# 0002 — Monorepo

Date: 2026-10-15 · Status: Accepted

## Decision

- Build system: Turborepo 2.11 on top of pnpm 12 workspaces (`apps/*`, `packages/*`, `playground`).
- Shared code ships as Just-in-Time internal packages — `@repo/ui`, `@repo/ai`,
  `@repo/typescript-config` — raw TypeScript/TSX source, no build step of their own.
- Shared dependency versions live in one pnpm catalog instead of being repeated per package.
- Next.js is pinned to an exact version (16.4.0), not a range.
- Environment variables are validated at startup with `@t3-oss/env-nextjs` + Zod; each app
  keeps its own `.env.local`.

## Why

- Turborepo runs each package's scripts in dependency order and caches the results, so
  unrelated packages don't rebuild or retype on every change.
- JIT packages mean editing `@repo/ui` or `@repo/ai` is instant — no separate build/watch
  step; the consuming app's own bundler compiles the source directly.
- A catalog keeps `react`, `typescript`, etc. at one version across every package instead of
  drifting package by package.
- Pinning Next.js exactly avoids a silent minor/patch bump changing App Router behavior
  mid-course.
- Validating env at import time turns a missing key into a clear startup error instead of a
  runtime crash deep inside a request handler.

## Trade-offs

- JIT packages have no build output of their own, so Turbo can't cache a "build" for them —
  every consuming app must list them in `transpilePackages` and compile their source itself.
- Tailwind only scans each app's own files by default, so `packages/ui`'s classes need an
  explicit `@source` in each app's `globals.css` or they get purged.
- pnpm 12's default supply-chain policy (`minimumReleaseAge`) can delay installing a
  brand-new package version by about a day; we accept that for the extra protection against
  a just-published malicious release.
