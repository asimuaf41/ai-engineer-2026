# 0001 — Stack and versions

Date: 2026-10-12 · Status: Accepted

## Decision

- Runtime: Node.js 24 LTS
- Package manager: pnpm 12 (workspaces for the Day 2 monorepo)
- Language: TypeScript (strict) for product code; JavaScript allowed in playground experiments
- AI: Anthropic TypeScript SDK (@anthropic-ai/sdk 0.133), default model `claude-opus-5-5`
- Monorepo: Turborepo (Day 2)

## Why

- LTS Node = security updates for years, no surprise breaks.
- pnpm is the standard for Turborepo monorepos and is faster with less disk use.
- Strict TypeScript catches undefined/null bugs before production; clients expect TS.
- One repo for the course keeps shared UI and AI code reusable across all products.

## Trade-offs

- Opus is the most capable default but not the cheapest. We will measure cost per request on Day 19 before choosing a cheaper model for high-volume routes.
- pnpm 10+ blocks install scripts by default; some packages need `pnpm approve-builds`.
