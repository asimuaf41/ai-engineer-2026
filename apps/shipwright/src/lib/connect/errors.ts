// What to tell the person when /o/<slug>/connect?error=<code> is in the address.
// The code comes from a URL, so ANYONE can type anything there. Rules:
// - only codes in this list are understood; everything else becomes "unknown";
// - the raw value is never shown, so a crafted link can't put its own words on our page;
// - every message is calm, plain English with no technical terms, and says whether anything changed.
export type ConnectErrorCode =
  | "github_state"
  | "github_not_yours"
  | "github_failed"
  | "github_not_configured"
  | "supabase_state"
  | "supabase_failed"
  | "supabase_no_org"
  | "supabase_not_configured"
  | "access_denied"
  | "needs_reconnect"
  | "rate_limited"
  | "unknown";

export type ConnectError = {
  code: ConnectErrorCode;
  title: string;
  body: string;
  // Which step the "Try again" button restarts. "current" = whichever step is open now.
  retry: "github" | "supabase" | "current" | "none";
};

const ERRORS: Record<ConnectErrorCode, Omit<ConnectError, "code">> = {
  github_state: {
    title: "That GitHub link has expired",
    body: "For your safety, the link only works for a few minutes and only once. Nothing was changed. Start again from step 1.",
    retry: "github",
  },
  github_not_yours: {
    title: "We couldn't confirm that GitHub installation is yours",
    body: "The installation you came back with isn't linked to your GitHub account, so we didn't connect it. Make sure you are signed in to the right GitHub account, then try again.",
    retry: "github",
  },
  github_failed: {
    title: "GitHub didn't connect",
    body: "Something went wrong while talking to GitHub. Nothing was changed. Please try again.",
    retry: "github",
  },
  github_not_configured: {
    title: "GitHub isn't switched on here yet",
    body: "We're still setting this up. Please check back soon.",
    retry: "none",
  },
  supabase_state: {
    title: "That Supabase link has expired",
    body: "For your safety, the link only works for a few minutes and only once. Nothing was changed. Start again from step 2.",
    retry: "supabase",
  },
  supabase_failed: {
    title: "Supabase didn't connect",
    body: "Something went wrong while talking to Supabase. Nothing was changed. Please try again.",
    retry: "supabase",
  },
  supabase_no_org: {
    title: "We couldn't find a Supabase organization to connect",
    body: "Your Supabase account needs to belong to at least one organization. Create or join one in Supabase, then try again.",
    retry: "supabase",
  },
  supabase_not_configured: {
    title: "Supabase isn't switched on here yet",
    body: "We're still setting this up. Please check back soon. You can skip this step for now.",
    retry: "none",
  },
  access_denied: {
    title: "You chose not to connect",
    body: "No problem. Nothing was shared with Shipwright. You can connect whenever you're ready.",
    retry: "current",
  },
  needs_reconnect: {
    title: "This connection needs to be authorized again",
    body: "The access was removed or has run out. Connect again to keep going. Your other settings stay as they are.",
    retry: "current",
  },
  rate_limited: {
    title: "Too many requests right now",
    body: "GitHub or Supabase is asking us to slow down. Wait a minute, then try again.",
    retry: "current",
  },
  unknown: {
    title: "Something went wrong",
    body: "We couldn't finish that. Nothing was changed. Please try again in a few minutes.",
    retry: "current",
  },
};

// Is this exactly one of OUR codes? (Used when a code is passed along in an address, so a made-up one is dropped.)
export const isConnectErrorCode = (value: unknown): value is ConnectErrorCode => typeof value === "string" && Object.hasOwn(ERRORS, value);

// `value` is whatever was in ?error= (a string, a list, or nothing). null = no error to show.
export function connectErrorFor(value: unknown): ConnectError | null {
  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return null;
  const first = Array.isArray(value) ? value[0] : value;
  // Object.hasOwn: "__proto__", "constructor" and "toString" are not our codes.
  const code: ConnectErrorCode = typeof first === "string" && Object.hasOwn(ERRORS, first) ? (first as ConnectErrorCode) : "unknown";
  return { code, ...ERRORS[code] };
}
