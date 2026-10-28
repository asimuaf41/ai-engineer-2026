# 0007 — Dashboards

Date: 2026-10-28 · Status: Accepted

## Context

Founders who ship with AI need to see their production score, find any issue fast, share a view with a
teammate, and never meet a blank or broken screen. The dashboard must also keep working when one
data source is slow or down.

## Decision

- **Layout:** route groups `(marketing)` and `(app)`. URLs don't change; the dashboard gets its own shell
  (sidebar, top bar) without the public header.
- **Tables:** TanStack Table v9 with explicit features (`tableFeatures`), module-scope `features` and
  `columns`, and client-side sorting, filtering and paging for now.
- **URL state:** nuqs for search, severity, status, sort and page, with all parsers in one
  `search-params.ts`. Row selection stays in `useState`: it is not worth sharing.
- **Command palette:** cmdk through shadcn `command`, with a word filter (every typed word must match)
  and an "Ask Shipwright" fallback when nothing matches.
- **Charts:** Recharts through shadcn `chart`, changed to set `--color-<key>` CSS variables with the
  `style` prop instead of `dangerouslySetInnerHTML`. Colors come from tokens, never hex.
- **Vendored code is ours:** the shadcn `chart`, `command` and `checkbox` files are edited. Never re-add
  them with `--overwrite`.
- **Failures:** each widget has its own Suspense and `catchError` boundary. Page-level `error.tsx` uses
  `retry()` and shows the error digest as a reference.
- **Empty states:** two kinds, "no matches" (with Reset) and "nothing yet" (with the next step).
- **Demo data:** seeded and deterministic, with `?simulate=error|empty|slow|widget-error` to show every state.
  Day 13 swaps the function bodies for Supabase; the signatures stay.
- **Guardrail:** hook rule 8 blocks the v8 table API, `reset()` in error boundaries, and hex colors in
  Recharts files.

## Alternatives rejected

- **TanStack Table v8:** the old API; v9 is stable and the hook now blocks v8 names.
- **AG Grid:** heavy, its own look, and a license for some features.
- **Tremor:** its own look, hard to match our tokens.
- **`useState` for filters:** a view can't be shared or bookmarked, and Back loses it.
- **One page-level error boundary:** one failing query blanks the whole dashboard.
- **A hot-keys library:** one shortcut (Cmd/Ctrl+K) doesn't need a dependency.

## Consequences

- Client-side filtering has to move to the server above a few thousand rows (`manual*` options, same URL params).
- "Mark as fixed" is local state until Day 13.
- Our edited shadcn files need a manual merge when upstream changes.
- Measured: shell about 90 ms, KPIs about 0.4 s, score chart about 1.2 s; the URL updates 300 ms after
  typing stops; the palette finds 1 match for "stripe" with the word filter vs 3 with cmdk's default fuzzy match.
