// The pair of tokens we keep for a connected Supabase account, and the rules for when to renew it.
// It is saved as ONE secret in Supabase Vault (never in a normal table). `expires_at` is a time in seconds since 1970,
// worked out from the `expires_in` Supabase tells us, never a lifetime we made up.
import { z } from "zod";

// Renew when the access token has 2 minutes or less left, so a request never goes out with a token that is about to die.
export const REFRESH_MARGIN_SECONDS = 120;

const tokenSetSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_at: z.number().int().positive(),
});

export type TokenSet = z.infer<typeof tokenSetSchema>;

export const nowSeconds = (): number => Math.floor(Date.now() / 1000);

export const serializeTokenSet = (set: TokenSet): string => JSON.stringify(set);

// Reads what we saved. null = it is not a valid token set (never throws, never prints what it saw).
export function parseTokenSet(text: string): TokenSet | null {
  try {
    const parsed = tokenSetSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const needsRefresh = (set: TokenSet, now: number = nowSeconds()): boolean => set.expires_at - now <= REFRESH_MARGIN_SECONDS;

// Builds the token set from the token endpoint's answer. If Supabase did not send a new refresh token, we keep the old one
// (so this works whether or not the refresh token rotates). null = there is no refresh token at all.
export function tokenSetFromResponse(
  response: { access_token: string; refresh_token?: string | undefined; expires_in: number },
  previousRefreshToken: string | undefined,
  now: number = nowSeconds(),
): TokenSet | null {
  const refreshToken = response.refresh_token ?? previousRefreshToken;
  if (!refreshToken) return null;
  return { access_token: response.access_token, refresh_token: refreshToken, expires_at: now + response.expires_in };
}
