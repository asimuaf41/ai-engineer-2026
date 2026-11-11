---
paths: ["apps/mobile/**"]
---

# apps/mobile rules (Expo SDK 58, Expo Router, Uniwind)

1. **Let Expo pick versions.** The SDK comes from the template (`default@sdk-58`). React and React Native are
   Expo's exact versions, not the pnpm catalog. Add native packages with `pnpm exec expo install`, not `pnpm add`.
2. **No `dev` script.** `turbo dev` must not start an interactive Expo server. Use
   `pnpm --filter mobile start | web | ios | android`.
3. **Colors come from `@repo/ui`.** Run `pnpm --filter mobile tokens` after changing a color there. Never edit
   `src/theme/tokens.css`; `check-types` runs `tokens --check` and fails when it is stale. Commit `tokens.css` and
   `src/uniwind-types.d.ts` (CI has no Metro to make them).
4. **Write full Tailwind class names.** Use a map like `Severity -> { box, text }`. Class names built from strings
   are invisible to Tailwind.
5. **Navigation options take style objects, not classNames.** Read token colors with `useCSSVariable`. Switch
   themes with `Uniwind.setTheme` and read `useUniwind()` (`hasAdaptiveThemes` means "system").
6. **Import `global.css` once, in `src/app/_layout.tsx`.** Never in an index file: it breaks fast refresh.
7. **Only `@repo/ai/shared` and `@repo/ui` CSS.** Never the `@repo/ai` root or its other subpaths (server code
   breaks the phone bundle), and never `@repo/ui` components. `shared` must stay pure TypeScript: a change there
   changes web and phone together. A hook enforces this.
8. **Only `EXPO_PUBLIC_*` env vars, and they are public.** Anyone can read them from the app. No secrets, no keys.
9. **Phone UI basics.** Lists use `FlatList`, not `map` in a `ScrollView`. Every string is inside `<Text>`.
   Buttons get `accessibilityRole`, a label and `hitSlop`. `web.output: "single"` is only a browser preview; the
   real website is the Next.js app.

## Native UI (Day 11, see ADR 0010; hook rule 11 enforces 11-13)

10. **Tabs are native; the side menu wraps them.** Use `NativeTabs` from `expo-router/native-tabs`, not JS tabs (they are not native and get no Liquid Glass). The drawer (`expo-router/drawer`, in `src/app/(drawer)`) holds the tabs plus the advanced views; open it with `MenuButton` (a swipe alone is not enough, rule 17). Stack screens (issue, triage, ask) stay on the root Stack.
11. **Animate on the UI thread.** Reanimated 4 only: no `Animated` or `PanResponder` from `react-native`. To cross threads use
    `scheduleOnRN` / `scheduleOnUI` from `react-native-worklets`, never `runOnJS` / `runOnUI`.
12. **Gesture Handler 3 hooks.** `usePanGesture`, `useTapGesture`, `useLongPressGesture`, not the `Gesture.Pan()` builder.
    Gestures only work inside the `GestureHandlerRootView` in the root layout.
13. **Sheets are native routes.** A bottom sheet is a Stack screen with `presentation: "formSheet"`. No `@gorhom/bottom-sheet`.
    Set `sheetAllowedDetents` (ascending fractions), `sheetGrabberVisible`, `sheetCornerRadius`, and take `contentStyle` from the
    token with `useCSSVariable`.
14. **Haptics are rare.** Only at a threshold, on success, or for a serious action. Fire once, never inside `onUpdate`. From a
    worklet wrap them in `scheduleOnRN`. Respect the haptics setting (`useHaptics`). The simulator has no haptics.
15. **Follow system Reduce Motion.** Keep `ReducedMotionConfig mode={ReduceMotion.System}` in the root layout.
16. **Icons are SF Symbols.** Use `SymbolView` from `expo-symbols` with both `ios` and `android` names. It is a native package.
17. **Every gesture has a plain alternative.** Swipe and long-press also need `accessibilityActions` and/or a visible button
    (the detail screen has a "Triage" button).
18. **Big touch targets.** Rows in a sheet are at least 56 high; small controls get `hitSlop`.
19. **Triage goes through the store.** Call `triage(id, status)` from `triage-store`, then `router.back()`. Screens reached by
    id (detail, sheet) need a not-found state. Lists show only open issues, so a status that leaves "open" leaves the list.

## AI on mobile (Day 12, see ADR 0012; hook rule 12 enforces 20-24)

20. **One AI backend.** The app calls the same `/api/chat` as the website. Models run on the server; the app never holds an
    AI key and never imports `streamText`, `generateText` or an AI provider SDK.
21. **Stream with `expo/fetch`.** React Native's own `fetch` cannot stream a response. Build the transport with
    `createAskTransport()` from `@/lib/ask`; do not make a second one.
22. **No `resume` in `useChat`.** It reads `document` (web only). If the app goes to the background, `stop()` and offer Retry.
23. **Addresses come from `apiUrl()`.** `localhost` on a phone means the phone. Never type `localhost` or a `192.168.x.x` address.
24. **Markdown is `MarkdownLite`.** Our own small renderer in `components/chat/markdown-lite.tsx`. No `streamdown`, `react-markdown`
    or other markdown libraries (web-only or unmaintained).
25. **Tool types live in `@repo/ai/shared`.** `AskUITools` is shared with the web app, and `contract.check.ts` fails
    `check-types` if the server's tools drift from it. Change the shared type first, never loosen the check.
26. **Keyboard = `react-native-keyboard-controller`.** `KeyboardProvider` in the root layout, `KeyboardChatScrollView` for the
    list and `KeyboardStickyView` for the composer. The built-in `KeyboardAvoidingView` is unreliable on Android edge-to-edge.
27. **Errors are calm and shared.** Show the wording from `describeAskError` (`parseAskError` in `@/lib/ask`), never raw error
    text or URLs. A daily limit is a friendly card, not a red error, and Retry is hidden for it.
28. **Streaming UI is cheap.** `throttle` on `useChat`, scroll when a message starts (not per chunk), a screen-reader
    announcement when an answer finishes, and Reduce Motion respected.
29. **Variants install side by side.** `app.config.ts` reads `APP_VARIANT` (development, preview, production) to set the name
    and bundle id; only `EXPO_PUBLIC_` values reach the app. Native changes need a new build.

## Before saying "done"

- A native change (new native package, `app.json` plugin, icon, scheme, permission) needs a rebuild: `pnpm ios:build` on
  the Mac for iOS and a **new EAS Android build**. A plain code reload is not enough. Put native packages in before the
  build so we don't rebuild.
- Proof = `pnpm --filter mobile check-types` **and** `pnpm --filter mobile exec expo export --platform android
  --output-dir <temp folder>` (this proves the native bundle builds, not just web; then delete the folder) **and** a
  simulator screenshot: `xcrun simctl io booted screenshot docs/screens/<name>.png`.
- Proof for chat changes = `check-types` + android export + a Simulator screenshot of a **finished answer** + the
  **server log line** (`[api/chat] client=... mode=... messages=... left=...`) for that request.
