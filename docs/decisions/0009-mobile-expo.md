# 0009 — Mobile app: Expo in the monorepo

Date: 2026-11-06 · Status: Accepted

## Context

Founders check their production score on the phone, not at a desk. The phone app only needs to show scores and
open issues, and it should reuse the issue types, demo data and color tokens we already have. We are one person:
a second team, a second language or a second design system is not an option.

## Decision

- **Expo SDK 58 with Expo Router, inside the Turborepo** (`apps/mobile`). The SDK is picked by the template
  (`default@sdk-58`); React and React Native follow Expo's exact versions, not the pnpm catalog.
- **Development builds through EAS**, because Expo Go 58 is not in the app stores. `eas.json` has `development`,
  `preview` and `production` profiles.
- **Uniwind for Tailwind 4 on the phone**, with the same color tokens as the web.
- **Tokens synced by a script** (`pnpm --filter mobile tokens`) that copies the colors from `@repo/ui`'s
  `globals.css` into `tokens.css`. `--check` runs inside `check-types`, so a stale file fails CI.
- **Shared data in `@repo/ai/shared`**: the `Issue` types, `DEMO_ISSUES` and `productionScore`, as pure TypeScript
  that web, server and phone all import. The phone never imports the `@repo/ai` root.
- **`web.output: "single"`** so the browser preview works as a plain single-page app. The real website is Next.js.
- **Guardrail:** hook rule 10 blocks web and server imports, HTML tags and non-public env vars in `apps/mobile`, and
  any outside import in `shared`. Rules for working in the app are in `.claude/rules/mobile.md`.

## Alternatives rejected

- **Bare React Native CLI:** more native setup to maintain and no EAS builds.
- **Flutter:** a different language, so no code sharing with our TypeScript.
- **NativeWind 4:** Tailwind 3 only, so the tokens would differ from the web's Tailwind 4.
- **A PWA:** no real push notifications or store presence (needed on Day 27).
- **Sharing UI components with react-native-web:** worse on both platforms; we share data and tokens instead.

## Consequences

- Native changes (a new native package, a plugin, an icon) need a new EAS build; plain code changes reload.
- The mobile React version follows Expo (19.3.0 today) and can differ from the web's (19.3.1).
- The free EAS plan allows about 15 builds a month, so add native packages before building, not after.
- `shared` is now a contract: changing it changes the website and the phone together.
- Not verified yet: the app has not been run on a real device or through an EAS build. `eas.json` pins Node 22.22.0
  and pnpm 12.11.2 for EAS, and whether EAS supports that pnpm version is unproven.
