// Our GitHub App, as seen from the server. One App object for the whole process.
// The private key and client secret come from env.server.ts (base64 key, never printed, never sent to the browser).
import "server-only";
import { App, Octokit } from "octokit";
import { getGitHubConfig } from "@/lib/env.server";
import { listReposWith, userCanSeeInstallationWith, type InstallationRepo } from "@/lib/github/repos";

export type { InstallationRepo };

let app: App | undefined;

function getApp(): App {
  if (app) return app;
  const config = getGitHubConfig();
  // Callers check isGitHubConfigured() first. This is the safety net.
  if (!config) throw new Error("The GitHub App is not configured. See apps/shipwright/.env.example.");

  const privateKey = Buffer.from(config.GITHUB_APP_PRIVATE_KEY_BASE64, "base64").toString("utf8");
  if (!privateKey.includes("-----BEGIN")) {
    throw new Error("GITHUB_APP_PRIVATE_KEY_BASE64 is not a base64-encoded .pem key (base64 -i key.pem | tr -d '\\n').");
  }
  app = new App({
    appId: config.GITHUB_APP_ID,
    privateKey,
    oauth: { clientId: config.GITHUB_APP_CLIENT_ID, clientSecret: config.GITHUB_APP_CLIENT_SECRET },
  });
  return app;
}

// An Octokit that acts AS the installation (it can see only the repositories the person chose to share).
export async function installationOctokit(installationId: number): Promise<Octokit> {
  return getApp().getInstallationOctokit(installationId);
}

export async function listInstallationRepos(installationId: number): Promise<InstallationRepo[]> {
  return listReposWith(await installationOctokit(installationId));
}

// `userToken` is the short-lived token for the person who just came back from GitHub.
export async function userCanSeeInstallation(userToken: string, installationId: number): Promise<boolean> {
  return userCanSeeInstallationWith(new Octokit({ auth: userToken }), installationId);
}

// Swaps the one-time ?code=... for a user token. Use it once, then call revokeUserToken(). Never store or log it.
export async function exchangeCodeForUserToken(code: string): Promise<string> {
  const { authentication } = await getApp().oauth.createToken({ code });
  return authentication.token;
}

// Best effort: tell GitHub to forget the token now, instead of letting it live for its 8 hours.
export async function revokeUserToken(token: string): Promise<void> {
  try {
    await getApp().oauth.deleteToken({ token });
  } catch {
    console.warn("[github] could not revoke the temporary user token");
  }
}
