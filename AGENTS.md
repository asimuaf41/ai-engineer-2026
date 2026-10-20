# AGENTS.md

Course and portfolio monorepo of Asim Ali — read by Claude Code, Cursor and any agent that supports AGENTS.md.

## Stack

- Turborepo + pnpm 12 workspaces, Node 24 LTS, TypeScript strict everywhere.
- Next.js 16.4 App Router (Turbopack), React 19, Tailwind v4.
- Zod for validation; `@t3-oss/env-nextjs` for env vars.
- Claude API only through `@repo/ai`.

## Layout

- `apps/shipwright` — flagship product, port 3000
- `apps/lab` — experiments, port 3001
- `packages/ui` (`@repo/ui`) — shared components and `cn()`
- `packages/ai` (`@repo/ai`) — Claude client, models, agent loops
- `packages/typescript-config` — shared tsconfigs
- `playground/` — scripts run with tsx
- `docs/` — project brief and decisions (ADRs)

## Commands

- `pnpm dev` / `pnpm build` / `pnpm check-types` — all workspaces via Turborepo
- `pnpm agent` — run the playground's security-audit script
- `pnpm --filter lab check-types` — one workspace only
- `SKIP_ENV_VALIDATION=1 pnpm check-types` — when there are no real keys

## Conventions

- Shared code goes in `packages/` only when 2+ apps use it; never copy-paste between apps.
- Model ids ONLY in `packages/ai/src/models.ts` (`MODELS`); never hardcode a model string.
- Shared versions live in the pnpm catalog (`pnpm-workspace.yaml`); packages use `"catalog:"`.
- Env vars only via each app's `src/env.ts`; secret modules start with `import "server-only"`.
- Every UI has loading, error and empty states, and every input has a label.
- Use `import type` for type-only imports. No `any`, no `@ts-ignore`.

## Safety

- Never read, print or edit `.env` / `.env.local` or any real key — only `.env.example`.
- Never put secrets in `NEXT_PUBLIC_*` — those ship to the browser.
- Never commit or push unless Asim asks — Asim pushes manually.
- Fix root causes; never silence errors with `"use client"`, `any` or a swallowing try/catch.
