// PKCE ("pixy"): a way to make a sign-in code useless to anyone who steals it.
// 1. Before sending the person away, we invent a secret "verifier" and send only its SHA-256 fingerprint (the "challenge").
// 2. When we swap the returned code for a token, we show the verifier. The other side hashes it and checks it matches.
// A thief who intercepts the redirect has the code but not the verifier, so the code is worthless to them.
// Pure code (Node's crypto only), so it is easy to test.
import { createHash, randomBytes } from "node:crypto";

// 32 random bytes = 43 characters of base64url, which is inside the 43 to 128 characters the standard asks for.
export const newVerifier = (): string => randomBytes(32).toString("base64url");

export const challengeFor = (verifier: string): string => createHash("sha256").update(verifier).digest("base64url");

// Is this value shaped like a verifier we could have made? (Used when one comes back out of the state cookie.)
export const isValidVerifier = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{43,128}$/.test(value);
