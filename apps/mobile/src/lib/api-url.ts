import Constants from "expo-constants";
import { WEB_URL } from "@/lib/env";

// "localhost" is wrong on a phone: it means the phone itself, not the Mac running `pnpm dev`.
// While developing, Expo already knows the Mac's address (hostUri, like "192.168.1.5:8081"), so we reuse
// that host and add the web app's port. Set EXPO_PUBLIC_API_URL to point somewhere else.
// Installed builds always talk to the deployed web app.
function devBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override.replace(/\/$/, "");
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return host ? `http://${host}:3000` : WEB_URL;
}

export function apiUrl(path: string): string {
  return `${__DEV__ ? devBaseUrl() : WEB_URL}${path}`;
}
