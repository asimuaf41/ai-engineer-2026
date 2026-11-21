// Where to send someone after they sign in. The value comes from a URL or a cookie, so anyone can put anything in it.
// If we trusted it, a link like /login?next=https://evil.example would sign you in and then send you to a fake site.
// So only a path on THIS site is allowed. Pure code (no Next.js, no Supabase) so it is easy to test.
export const DEFAULT_NEXT = "/onboarding";

// The sign-in action remembers where to go in this short-lived cookie, because the email link itself stays plain.
export const NEXT_COOKIE = "sw-next";
export const NEXT_COOKIE_PATH = "/auth";

const MAX_LENGTH = 512;
// A backslash (browsers treat "/\evil.example" like "//evil.example"), control characters and any whitespace.
const BAD_CHARACTERS = /[\\\u0000-\u001f\u007f\s]/;

export function safeNext(next: string | null | undefined): string {
  if (typeof next !== "string" || next.length === 0 || next.length > MAX_LENGTH) return DEFAULT_NEXT;
  // Must be a path on this site: starts with one slash, and not two ("//host" means another site).
  if (!next.startsWith("/") || next.startsWith("//")) return DEFAULT_NEXT;
  if (BAD_CHARACTERS.test(next)) return DEFAULT_NEXT;

  // Last check: resolve it the way a browser would, and make sure it still lands on the same site.
  try {
    if (new URL(next, "http://site.invalid").origin !== "http://site.invalid") return DEFAULT_NEXT;
  } catch {
    return DEFAULT_NEXT;
  }
  return next;
}
