// Tests against a PRETEND Supabase: we check exactly what we send, and that every failure is handled without leaking a secret.
import assert from "node:assert/strict";
import { test } from "node:test";
import { SupabaseOAuthError } from "./errors.ts";
import { buildAuthorizeUrl, exchangeCode, refreshTokens, type OAuthClient } from "./oauth-core.ts";

const NOW = 1_800_000_000;
const SECRET = "client-secret-DO-NOT-LEAK";
const REFRESH = "refresh-token-DO-NOT-LEAK";
const CODE = "one-time-code-DO-NOT-LEAK";
const VERIFIER = "v".repeat(43);

type Seen = { url: string; method?: string; headers: Record<string, string>; body: URLSearchParams };

function pretendSupabase(reply: { status?: number; body?: unknown; text?: string }) {
  const seen: Seen[] = [];
  const send = (async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({
      url: String(url),
      method: init?.method,
      headers: Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>)),
      body: new URLSearchParams(String(init?.body ?? "")),
    });
    return new Response(reply.text ?? JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const client: OAuthClient = { clientId: "client-id-1", clientSecret: SECRET, redirectUri: "http://localhost:3000/api/supabase/callback", fetch: send };
  return { client, seen };
}

const good = { access_token: "access-NEW", refresh_token: "refresh-NEW", expires_in: 3600, token_type: "Bearer" };

test("the sign-in link has every required part, S256, and no scope", () => {
  const url = new URL(buildAuthorizeUrl({ clientId: "cid", redirectUri: "http://localhost:3000/api/supabase/callback", state: "st", challenge: "ch" }));
  assert.equal(url.origin + url.pathname, "https://api.supabase.com/v1/oauth/authorize");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    client_id: "cid",
    redirect_uri: "http://localhost:3000/api/supabase/callback",
    response_type: "code",
    state: "st",
    code_challenge: "ch",
    code_challenge_method: "S256",
  });
  assert.equal(url.searchParams.has("scope"), false);
});

test("swapping a code: right address, form-encoded, Basic client login, verifier sent, secret NOT in the body", async () => {
  const { client, seen } = pretendSupabase({ body: good });
  const set = await exchangeCode(client, { code: CODE, verifier: VERIFIER }, NOW);

  assert.equal(seen.length, 1);
  assert.equal(seen[0]?.url, "https://api.supabase.com/v1/oauth/token");
  assert.equal(seen[0]?.method, "POST");
  assert.equal(seen[0]?.headers["content-type"], "application/x-www-form-urlencoded");
  assert.equal(seen[0]?.headers.authorization, `Basic ${Buffer.from(`client-id-1:${SECRET}`).toString("base64")}`);
  assert.deepEqual(Object.fromEntries(seen[0]?.body ?? []), {
    grant_type: "authorization_code",
    code: CODE,
    redirect_uri: "http://localhost:3000/api/supabase/callback",
    code_verifier: VERIFIER,
  });
  assert.deepEqual(set, { access_token: "access-NEW", refresh_token: "refresh-NEW", expires_at: NOW + 3600 });
});

test("refreshing: sends the refresh token, saves the NEW one and the new expiry", async () => {
  const { client, seen } = pretendSupabase({ body: { ...good, expires_in: 1800 } });
  const set = await refreshTokens(client, REFRESH, NOW);
  assert.deepEqual(Object.fromEntries(seen[0]?.body ?? []), { grant_type: "refresh_token", refresh_token: REFRESH });
  assert.equal(set.refresh_token, "refresh-NEW");
  assert.equal(set.expires_at, NOW + 1800);
});

test("refreshing when Supabase sends no new refresh token keeps the old one", async () => {
  const { client } = pretendSupabase({ body: { access_token: "access-NEW", expires_in: 600 } });
  const set = await refreshTokens(client, REFRESH, NOW);
  assert.equal(set.refresh_token, REFRESH);
});

test("each refusal is sorted: 400 and 401 mean 'connect again', 429 means wait, the rest is a plain failure", async () => {
  for (const [status, kind] of [[400, "invalid_grant"], [401, "invalid_grant"], [429, "rate_limited"], [403, "failed"], [500, "failed"], [503, "failed"]] as const) {
    const { client } = pretendSupabase({ status, body: { error: "whatever" } });
    await assert.rejects(refreshTokens(client, REFRESH, NOW), (error: unknown) => error instanceof SupabaseOAuthError && error.kind === kind && error.status === status, `status ${status}`);
  }
});

test("a network failure or timeout is a plain 504 failure, with nothing from the thrown error kept", async () => {
  const client: OAuthClient = {
    clientId: "client-id-1",
    clientSecret: SECRET,
    redirectUri: "http://localhost:3000/api/supabase/callback",
    fetch: (async () => {
      throw new TypeError(`fetch failed for ${CODE} ${SECRET}`);
    }) as typeof fetch,
  };
  await assert.rejects(exchangeCode(client, { code: CODE, verifier: VERIFIER }, NOW), (error: unknown) => {
    const text = `${String(error)} ${(error as Error).stack}`;
    return error instanceof SupabaseOAuthError && error.status === 504 && error.kind === "failed" && !text.includes(SECRET) && !text.includes(CODE);
  });
});

test("every request carries a timeout, so a hung Supabase cannot hang us", async () => {
  let signal: AbortSignal | null | undefined;
  const client: OAuthClient = {
    clientId: "c",
    clientSecret: SECRET,
    redirectUri: "http://localhost:3000/api/supabase/callback",
    fetch: (async (_url: string | URL | Request, init?: RequestInit) => {
      signal = init?.signal;
      return new Response(JSON.stringify(good), { status: 200 });
    }) as typeof fetch,
  };
  await exchangeCode(client, { code: CODE, verifier: VERIFIER }, NOW);
  assert.ok(signal instanceof AbortSignal);
});

test("characters like & = and spaces in state and redirect_uri are escaped, not able to add parameters", () => {
  const url = new URL(buildAuthorizeUrl({ clientId: "a&b=c", redirectUri: "http://localhost/cb?x=1&y=2", state: "s&evil=1 x", challenge: "ch" }));
  assert.equal(url.searchParams.get("client_id"), "a&b=c");
  assert.equal(url.searchParams.get("redirect_uri"), "http://localhost/cb?x=1&y=2");
  assert.equal(url.searchParams.get("state"), "s&evil=1 x");
  assert.equal(url.searchParams.has("evil"), false);
  assert.equal(url.searchParams.has("y"), false);
});

test("an answer that is not what we expect is a failure, never a half-saved token", async () => {
  for (const reply of [
    { text: "not json" },
    { body: {} },
    { body: { access_token: "a" } },
    { body: { access_token: "a", refresh_token: "r", expires_in: 0 } },
    { body: { access_token: "a", refresh_token: "r", expires_in: -5 } },
    { body: { access_token: "a", refresh_token: "r", expires_in: "3600" } },
    { body: { access_token: "a", refresh_token: "r", expires_in: 1.5 } },
    { body: { access_token: "", refresh_token: "r", expires_in: 60 } },
  ]) {
    const { client } = pretendSupabase(reply);
    await assert.rejects(exchangeCode(client, { code: CODE, verifier: VERIFIER }, NOW), SupabaseOAuthError, JSON.stringify(reply));
  }
});

test("a first sign-in whose answer has no refresh token is refused (we could never renew it)", async () => {
  const { client } = pretendSupabase({ body: { access_token: "a", expires_in: 60 } });
  await assert.rejects(exchangeCode(client, { code: CODE, verifier: VERIFIER }, NOW), SupabaseOAuthError);
});

test("no error ever contains the client secret, the code, the verifier or a token, even if Supabase echoes them back", async () => {
  const echo = { error: `bad ${CODE} ${REFRESH} ${SECRET} ${VERIFIER}`, access_token: "access-DO-NOT-LEAK" };
  for (const status of [400, 401, 429, 500]) {
    const { client } = pretendSupabase({ status, body: echo });
    try {
      await exchangeCode(client, { code: CODE, verifier: VERIFIER }, NOW);
      assert.fail("should have thrown");
    } catch (error) {
      const everything = `${String(error)} ${(error as Error).message} ${(error as Error).stack} ${JSON.stringify(error)}`;
      for (const secret of [SECRET, CODE, REFRESH, VERIFIER, "access-DO-NOT-LEAK"]) assert.equal(everything.includes(secret), false, `status ${status} leaked ${secret.slice(0, 8)}`);
    }
  }
});
