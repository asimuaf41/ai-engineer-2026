# ai-engineer-2026

Course and portfolio monorepo for **Asim Ali — AI Product Engineer**.

Four products, built one feature per day:

| Product              | What it does                                                                               | Status               |
| -------------------- | ------------------------------------------------------------------------------------------ | -------------------- |
| **Shipwright**       | AI agents audit, prove and fix production problems in AI-built apps, then guard every push | Planned (Days 10–20) |
| **[Shopify app]**    | Embedded Shopify app: AI product content + storefront shopping assistant                   | Planned (Days 28–36) |
| **[Healthcare app]** | Clinic AI assistant, HIPAA-aware, synthetic data only                                      | Planned (Days 37–45) |
| **Add-ons**          | MCP servers, voice agent, n8n automations                                                  | Planned (Days 21–27) |

## Docs

- [Project brief](docs/project-brief.md)
- [Decisions](docs/decisions/)

## Layout

```
apps/
  shipwright/           # @repo/shipwright — marketing site, localhost:3000
  lab/                  # @repo/lab — security audit agent demo, localhost:3001
packages/
  ai/                   # @repo/ai — Claude client, models, audit loop
  ui/                   # @repo/ui — shared Button/Card components
  typescript-config/    # @repo/typescript-config — shared tsconfig bases
playground/             # @repo/playground — scratch scripts, not product code
docs/                   # project brief + architecture decision records
```

## Run locally

```bash
pnpm install
cp apps/shipwright/.env.example apps/shipwright/.env.local  # add NEXT_PUBLIC_APP_URL
cp apps/lab/.env.example apps/lab/.env.local                # add ANTHROPIC_API_KEY
pnpm dev
```

- Shipwright: http://localhost:3000
- Lab: http://localhost:3001

## Run the playground

```bash
cp playground/.env.example playground/.env.local  # add ANTHROPIC_API_KEY
pnpm agent
```
