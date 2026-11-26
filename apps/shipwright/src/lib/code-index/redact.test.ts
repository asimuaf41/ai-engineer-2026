import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { redactSecrets, SECRET_PATTERNS } from "./redact.ts";

// Built at run time, so this file itself never contains something that looks like a real key (the Day 3 hook would refuse it).
const anthropicKey = "sk-ant-" + "a1B2".repeat(8);
const supabaseKey = "sb_secret_" + "Qw3rTy".repeat(5);
const stripeKey = "sk_live_" + "Z9y8X7".repeat(5);

test("an Anthropic key in code is masked and counted", () => {
  const result = redactSecrets(`const key = "${anthropicKey}";`);
  assert.equal(result.text, 'const key = "[REDACTED:anthropic-key]";');
  assert.equal(result.count, 1);
  assert.deepEqual(result.kinds, ["anthropic-key"]);
});

test("a Supabase secret key is masked", () => {
  const result = redactSecrets(`createClient(url, "${supabaseKey}")`);
  assert.equal(result.text, 'createClient(url, "[REDACTED:supabase-secret-key]")');
  assert.equal(result.count, 1);
});

test("a live Stripe key is masked", () => {
  const result = redactSecrets(`stripe(${JSON.stringify(stripeKey)})`);
  assert.equal(result.text, 'stripe("[REDACTED:stripe-live-key]")');
  assert.deepEqual(result.kinds, ["stripe-live-key"]);
});

test("several secrets are all masked, counted, and each kind is listed once", () => {
  const result = redactSecrets(`${anthropicKey}\n${anthropicKey}\n${stripeKey}`);
  assert.equal(result.count, 3);
  assert.deepEqual([...result.kinds].sort(), ["anthropic-key", "stripe-live-key"]);
});

test("a .env file with a real-looking Supabase key: the value is masked, counted once, the name stays", () => {
  const result = redactSecrets(`SUPABASE_SECRET_KEY=${supabaseKey}\n`, { envFile: true });
  assert.equal(result.text, "SUPABASE_SECRET_KEY=[REDACTED:supabase-secret-key]\n");
  assert.equal(result.count, 1);
  assert.deepEqual(result.kinds, ["supabase-secret-key"]);
});

test(".env files: every value is masked, except empty ones and obvious placeholders", () => {
  const env = [
    "# a comment with KEY=value in it",
    "DATABASE_URL=postgres://user:hunter2@db.example.com:5432/app",
    'export API_TOKEN="abc123def456"   # trailing comment',
    "EMPTY=",
    "API_KEY=your-key-here",
    "OTHER=<your-token>",
    "SECRET=changeme",
    "  SPACED = 'quoted value'",
  ].join("\n");
  const result = redactSecrets(env, { envFile: true });
  assert.equal(
    result.text,
    [
      "# a comment with KEY=value in it",
      "DATABASE_URL=[REDACTED:env-value]",
      'export API_TOKEN="[REDACTED:env-value]"   # trailing comment',
      "EMPTY=",
      "API_KEY=your-key-here",
      "OTHER=<your-token>",
      "SECRET=changeme",
      "  SPACED = '[REDACTED:env-value]'",
    ].join("\n"),
  );
  assert.equal(result.count, 3);
  assert.doesNotMatch(result.text, /hunter2|abc123def456|quoted value/);
});

test("a multi-line quoted value (a private key) is masked on every line, and the line count stays the same", () => {
  const env = ['PRIVATE_KEY="-----BEGIN PRIVATE KEY-----', "MIIEvQIBADANBgkqhkiG9w0BAQEFAASC", "abcDEF+/xyz==", '-----END PRIVATE KEY-----"', "NEXT=plain"].join("\n");
  const result = redactSecrets(env, { envFile: true });
  assert.equal(result.count, 2);
  assert.equal(result.text.split("\n").length, 5);
  assert.doesNotMatch(result.text, /BEGIN|MIIEv|abcDEF|END PRIVATE|plain/);
  assert.ok(result.text.startsWith('PRIVATE_KEY="[REDACTED:env-value]"'));
  // A quote that never closes masks everything up to the end of the file.
  const open = redactSecrets('K="line one\nline two secret\n', { envFile: true });
  assert.doesNotMatch(open.text, /line one|secret/);
});

test("text stuck to a closing quote is part of the value and is masked too", () => {
  assert.equal(redactSecrets("A='abc'def", { envFile: true }).text, "A='[REDACTED:env-value]'");
  assert.doesNotMatch(redactSecrets('A="p"ss"word"', { envFile: true }).text, /ss|word/);
  // A real comment after the closing quote is kept.
  assert.equal(redactSecrets("A='abc' # note", { envFile: true }).text, "A='[REDACTED:env-value]' # note");
});

test("only short, exact placeholders are skipped: 'your_real_prod_password_1' is a secret", () => {
  const result = redactSecrets("DB_PASSWORD=your_real_prod_password_1\nA=your-key-here\nB=YOUR_API_KEY\nC=xxx", { envFile: true });
  assert.equal(result.text, "DB_PASSWORD=[REDACTED:env-value]\nA=your-key-here\nB=YOUR_API_KEY\nC=xxx");
  assert.equal(result.count, 1);
});

test("a .env file keeps Windows line endings", () => {
  const result = redactSecrets("A=secret1\r\nB=secret2\r\n", { envFile: true });
  assert.equal(result.text, "A=[REDACTED:env-value]\r\nB=[REDACTED:env-value]\r\n");
});

test("redacting twice changes nothing the second time", () => {
  const once = redactSecrets(`KEY=${anthropicKey}\nOTHER=plain`, { envFile: true });
  const twice = redactSecrets(once.text, { envFile: true });
  assert.equal(twice.text, once.text);
  assert.equal(twice.count, 0);
});

test("text without secrets comes back unchanged, with a count of 0", () => {
  const code = 'export const url = process.env.NEXT_PUBLIC_URL; // sk-ant- is the prefix of a key';
  assert.deepEqual(redactSecrets(code), { text: code, count: 0, kinds: [] });
});

test("the original secret appears nowhere in the result", () => {
  const result = redactSecrets(`a=${anthropicKey}\nb=${supabaseKey}\nc=${stripeKey}`, { envFile: true });
  const everything = JSON.stringify(result);
  for (const secret of [anthropicKey, supabaseKey, stripeKey]) assert.ok(!everything.includes(secret));
});

test("the patterns match the Day 3 scanner hook (guard-secrets.mjs): if one changes, this fails", () => {
  const hook = readFileSync(new URL("../../../../../.claude/hooks/guard-secrets.mjs", import.meta.url), "utf8");
  assert.equal(SECRET_PATTERNS.length, 3);
  for (const { kind, pattern } of SECRET_PATTERNS) {
    assert.ok(hook.includes(pattern.source), `the hook no longer contains the pattern for ${kind}: ${pattern.source}`);
  }
});
