---
paths: ["apps/**"]
---

# Next.js app rules

- Server Components by default. Add `"use client"` only for state, effects or browser APIs,
  and only on the smallest component that needs it.
- Read env from `@/env`; modules that touch secrets start with `import "server-only"`.
- Route handlers: parse JSON safely, validate with Zod, return 400 with a friendly message for
  bad input and 502 with a generic message for upstream failures — log the real error server-side.
- Never send raw errors or stack traces to the browser.
- Use `@repo/ui` components first; combine classes with `cn()`.
- Every UI has loading, error (`role="alert"`) and empty states.
- Never wrap the hero headline (LCP) in `Reveal`. Server Components may pass only serializable
  props (no functions) to motion components.
- Sticky needs a tall parent (don't add `items-start` to its grid) and no `overflow` hidden/auto
  ancestor. Phones get a plain stack, no sticky columns.
- Grids that hold code or long text use `grid-cols-1` (`minmax(0,1fr)`), not bare `grid`.

## Dashboards

- Table/filter/sort/page state lives in the URL with nuqs (parsers in one `search-params.ts`);
  selection stays in `useState`.
- Each widget gets its own `WidgetBoundary` around its own `Suspense` + a matching skeleton.
- Two empty states: "no matches" (with Reset) and "nothing yet" (with the next step).
- Dates rendered on server AND client use a fixed `timeZone`. No "x days ago" in SSR.
- Don't animate table rows on filter/sort.
