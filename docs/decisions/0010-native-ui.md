# 0010 — Native UI: native tabs, UI-thread animation, formSheet

Date: 2026-11-09 · Status: Accepted

## Context

The phone app should feel premium and native on iOS and Android. Triage has to work with one thumb: swipe a card to
fix or snooze it, long-press (or tap "Triage") for every option. Animation and gestures must stay smooth even when
the JavaScript thread is busy.

## Decision

- **Expo Router native tabs** (`expo-router/native-tabs`) for the tab bar.
- **Reanimated 4 + Gesture Handler 3 hooks** (`usePanGesture`, `useTapGesture`, `useLongPressGesture`). Animation runs
  on the UI thread; we cross threads with `scheduleOnRN` / `scheduleOnUI` from `react-native-worklets`.
- **A native `formSheet` route** (`triage/[id]`, detents `[0.45, 0.9]`, grabber, corner radius 24) instead of a sheet
  library.
- **Haptics only at the threshold, on success and for serious actions**, fired once and respecting a user setting.
- **System Reduce Motion** through `ReducedMotionConfig` in the root layout.
- **Builds:** local iOS development builds on the Mac (`pnpm ios:build`), EAS for Android and later TestFlight.
- **Guardrail:** hook rule 11 blocks the rejected APIs below. Working rules are in `.claude/rules/mobile.md`.

## Alternatives rejected

- **JS tabs:** not native and no Liquid Glass.
- **`@gorhom/bottom-sheet`:** extra dependencies and JS-driven; not needed for a list of options.
- **Moti / `react-native` `Animated`:** run on the JS thread.
- **A custom swipe library:** `ReanimatedSwipeable` exists, but we wanted the threshold haptic and the fly-off;
  revisit if our swipe code grows.

## Consequences

- `expo-symbols` is a native package, so adding it needs a new development build (iOS) and EAS build (Android).
- The iOS Simulator has no haptics, so haptics are only checked on a real device.
- Before launch we must check performance on a real device, not only the simulator.
- The sheet depends on the native `formSheet` support in `react-native-screens`; option names can change between
  Expo SDKs, so re-check them on upgrade.
