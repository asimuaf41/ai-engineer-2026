# CLAUDE.md

Rules for working in this repo.

## Stack

- Turborepo + pnpm 12 workspaces. Node 24 LTS. TypeScript strict everywhere.
- Next.js 16.4.0 (`apps/shipwright`, `apps/lab`); shared code in `packages/` (`@repo/ui`,
  `@repo/ai`, `@repo/typescript-config`).
- Shared dependency versions live in the pnpm catalog (`pnpm-workspace.yaml`) — a new
  dependency used by more than one package goes there, not a one-off version per package.

## Commands

- `pnpm dev` — run all apps
- `pnpm build` — build all apps
- `pnpm check-types` — typecheck every package
- `pnpm agent` — run the playground's security-audit script

## Conventions

- Model ids live only in `packages/ai/src/models.ts` (`MODELS`) — never hardcode a model
  string elsewhere.
- Shared UI/logic goes in `packages/`, not copy-pasted between apps.
- Never put secrets in a `NEXT_PUBLIC_*` variable — those ship to the browser.
- Never commit `.env`/`.env.local` files or a real API key.
- Never run `git commit` or `git push` unless explicitly asked.
- Explain code in simple English — this is a learning repo.
