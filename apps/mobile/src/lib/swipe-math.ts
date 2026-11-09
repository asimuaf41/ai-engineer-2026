// The maths behind the swipe card. Plain TypeScript with no React Native, so it also runs in a Node script.
// The "worklet" lines let Reanimated call these functions from the gesture, on the UI thread.

// How far you must drag, as a share of the card width, before letting go counts as a decision.
export const THRESHOLD_RATIO = 0.3;
// A quick flick also counts, in points per second...
export const FLING_VELOCITY = 800;
// ...but only if the finger really moved this far (points), so a jittery tap can't triage.
export const MIN_FLING_TRAVEL = 24;
export const MAX_ROTATION_DEG = 4;
export const FLY_OFF_MS = 220;

export type SwipeStatus = "fixed" | "snoozed";

export function isPastThreshold(translationX: number, width: number): boolean {
  "worklet";
  return width > 0 && Math.abs(translationX) >= width * THRESHOLD_RATIO;
}

// What happens when the finger lifts: right = fixed, left = snoozed, or null to spring back.
export function releaseStatus(translationX: number, velocityX: number, width: number): SwipeStatus | null {
  "worklet";
  const direction = Math.sign(translationX);
  const fastFlick = Math.abs(velocityX) > FLING_VELOCITY;
  const flickingBack = fastFlick && Math.sign(velocityX) !== direction;
  // Dragged past the line but flicked back toward the start: you changed your mind.
  if (flickingBack) return null;

  const flingForward = fastFlick && Math.abs(translationX) >= MIN_FLING_TRAVEL;
  if (!isPastThreshold(translationX, width) && !flingForward) return null;
  return direction > 0 ? "fixed" : "snoozed";
}
