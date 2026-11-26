// Diagnoses "Something went wrong" after installing the GitHub App. A local dev script YOU run: it reads your env, but it
// only ever prints lengths, yes/no answers, HTTP status codes and public ids. Never a key, a token or a value.
//
//   pnpm --filter shipwright check:github -- --org <workspace-slug>
//
// What it checks, in the order the connect page needs them:
//   1. GITHUB_APP_ID is the numeric App ID (not the Client ID that starts with "Iv")
//   2. GITHUB_APP_PRIVATE_KEY_BASE64 decodes to a PEM (first 11 characters + length)
//   3. no quotes or stray spaces around the GITHUB_APP_* values (as the app reads them, and in the file itself)
//   4. GitHub accepts the key (GET /app), which installations exist, and whether the saved connection matches one of them
//   5. the same call the page makes: list the repositories of the saved installation
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { createAdminClient } from "../src/lib/supabase/admin";

const ok = (label: string, detail = "") => console.log(`  ok    ${label}${detail ? `  ${detail}` : ""}`);
const bad = (label: string, detail = "") => console.log(`  FAIL  ${label}${detail ? `  ${detail}` : ""}`);
const check = (pass: boolean, label: string, detail = "") => (pass ? ok(label, detail) : bad(label, detail));

// An error's name, its HTTP status if it has one, and a short message with anything long and base64-like blanked out.
function describeError(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const status = (error as { status?: unknown } | null)?.status;
  const raw = error instanceof Error ? error.message : "";
  const message = raw.replace(/[A-Za-z0-9+/=_-]{40,}/g, "[long value hidden]").slice(0, 100);
  return `${name}${typeof status === "number" ? ` status=${status}` : ""}${message ? ` message="${message}"` : ""}`;
}

async function main(): Promise<void> {
  const { values } = parseArgs({ args: process.argv.slice(2).filter((arg) => arg !== "--"), options: { org: { type: "string" } } });
  console.log("\nGitHub App check (nothing secret is printed)\n");

  // --- 1 and 3: the values exactly as the app reads them -------------------------------------------------------------
  const names = ["GITHUB_APP_ID", "GITHUB_APP_SLUG", "GITHUB_APP_CLIENT_ID", "GITHUB_APP_CLIENT_SECRET", "GITHUB_APP_PRIVATE_KEY_BASE64"] as const;
  console.log("1. App ID");
  const appId = process.env.GITHUB_APP_ID ?? "";
  check(appId !== "", "GITHUB_APP_ID is set", `length ${appId.length}`);
  check(/^\d+$/.test(appId), "GITHUB_APP_ID is only digits (the numeric App ID)", appId.startsWith("Iv") ? "it starts with Iv: that is the CLIENT ID, not the App ID" : "");

  console.log("\n2. Private key");
  const encoded = process.env.GITHUB_APP_PRIVATE_KEY_BASE64 ?? "";
  check(encoded !== "", "GITHUB_APP_PRIVATE_KEY_BASE64 is set", `length ${encoded.length}`);
  check(!encoded.includes("-----BEGIN"), "the value is base64, not the raw .pem text", encoded.includes("-----BEGIN") ? "it holds raw PEM text: base64 it with: base64 -i key.pem | tr -d '\\n'" : "");
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  check(decoded.startsWith("-----BEGIN"), "it decodes to text starting with -----BEGIN", `first 11 characters: "${decoded.slice(0, 11)}", decoded length ${decoded.length}`);
  check(decoded.includes("-----END"), "the decoded text has an -----END line (nothing cut off)");
  check(!/\s/.test(encoded), "no spaces or line breaks inside the base64 value");

  console.log("\n3. Quotes and spaces");
  for (const name of names) {
    const value = process.env[name];
    if (value === undefined) continue;
    const problems = [/^["'`]|["'`]$/.test(value) && "has a quote at an end", value !== value.trim() && "has a space at an end"].filter(Boolean);
    check(problems.length === 0, `${name} as the app reads it`, problems.join(", "));
  }
  // The file itself (the app's .env.local): only yes/no answers about the GITHUB_APP_* lines are printed.
  if (existsSync(".env.local")) {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const match = /^\s*(GITHUB_APP_[A-Z_]+)\s*=(.*)$/.exec(line);
      if (!match) continue;
      const raw = match[2] ?? "";
      const problems = [/^\s*["'`]/.test(raw) && "value starts with a quote", /["'`]\s*$/.test(raw.replace(/\s+#.*$/, "")) && "value ends with a quote", /\s+$/.test(raw) && "trailing space"].filter(Boolean);
      check(problems.length === 0, `${match[1]} in the file`, problems.join(", "));
    }
  } else {
    console.log("  (no .env.local in this folder, so the file itself was not checked)");
  }

  if (!/^\d+$/.test(appId) || !decoded.startsWith("-----BEGIN")) {
    console.log("\nStopping here: fix the FAIL lines above first. GitHub is not asked until the App ID and key look right.\n");
    return;
  }

  // --- 4: does GitHub accept the key? ----------------------------------------------------------------------------------
  console.log("\n4. GitHub");
  // octokit is ESM-only and this script runs as CommonJS, so it is loaded here with a dynamic import.
  const { App } = await import("octokit");
  const app = new App({ appId, privateKey: decoded });
  try {
    const { data } = await app.octokit.request("GET /app");
    ok("GitHub accepted the App ID and key (GET /app = 200)", `app slug "${data?.slug ?? "?"}"`);
  } catch (error) {
    bad("GitHub did not accept the App ID and key", describeError(error));
    console.log("     401 = wrong App ID or a key from a different app. A name with no status = the key could not be read.\n");
    return;
  }

  let installationIds: number[] = [];
  try {
    const installations = await app.octokit.paginate("GET /app/installations");
    installationIds = installations.map((item) => item.id);
    ok(`this App has ${installations.length} installation(s)`, installations.map((item) => `id ${item.id} (${item.target_type}${item.suspended_at ? ", suspended" : ""})`).join("; "));
  } catch (error) {
    bad("could not list the installations", describeError(error));
  }

  // --- the saved connection and the call the page makes --------------------------------------------------------------
  if (!values.org) {
    console.log("\nAdd --org <workspace-slug> to also check the saved connection and list its repositories.\n");
    return;
  }
  console.log("\n5. The saved connection and the repository list");
  const row = await createAdminClient().from("connections").select("external_id, status, orgs!inner(slug)").eq("provider", "github_app").eq("orgs.slug", values.org).maybeSingle();
  if (row.error) return bad("could not read the connection", `database code ${row.error.code}`);
  if (!row.data) return bad("no github_app connection saved for that workspace");
  const saved = Number(row.data.external_id);
  check(Number.isSafeInteger(saved), "the saved installation id is a whole number", `saved id ${row.data.external_id}, status ${row.data.status}`);
  check(installationIds.includes(saved), "the saved id is one of this App's installations", installationIds.includes(saved) ? "" : `saved ${row.data.external_id}, GitHub has ${installationIds.join(", ") || "none"}`);
  try {
    const installation = await app.getInstallationOctokit(saved);
    const { data } = await installation.request("GET /installation/repositories", { per_page: 1 });
    ok("listing repositories works (200)", `${data.total_count} repositories visible to the installation`);
  } catch (error) {
    bad("listing repositories failed (this is the call the page makes)", describeError(error));
  }
  console.log("");
}

main().catch((error: unknown) => {
  console.error(`\nThe check stopped: ${describeError(error)}\n`);
  process.exit(1);
});
