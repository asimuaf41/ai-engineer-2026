// repo-rules: allow-secret-samples
// Every key below is FAKE and built at runtime, so no realistic key sits in this file as text.

function base64Url(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fakeJwt(role: string): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ iss: "supabase", ref: "fakeproject", role }));
  return `${header}.${payload}.${"FAKE".repeat(6)}`;
}

export function fakeAnonJwt(): string {
  return fakeJwt("anon");
}

export function fakeServiceRoleJwt(): string {
  return fakeJwt("service_role");
}

export function fakeAnthropicKey(): string {
  return "sk-" + "ant-" + "api03-" + "FAKEFAKE".repeat(4);
}

export function fakeStripeKey(): string {
  return "sk_" + "live_" + "FAKEFAKE".repeat(3);
}

export const LEAKY_SAMPLE = [
  "# .env (all values are FAKE)",
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${fakeAnonJwt()}`,
  `SUPABASE_SERVICE_KEY=${fakeServiceRoleJwt()}`,
  `ANTHROPIC_API_KEY=${fakeAnthropicKey()}`,
  `STRIPE_SECRET_KEY=${fakeStripeKey()}`,
  "NEXT_PUBLIC_ANALYTICS_TOKEN=not-a-real-token",
  "",
].join("\n");
