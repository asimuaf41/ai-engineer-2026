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
