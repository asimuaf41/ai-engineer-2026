// EXPO_PUBLIC_* values are copied into the app bundle, so anyone can read them. Never put a secret here.
// This is only the address of the web dashboard, which is public anyway.
const DEFAULT_WEB_URL = "https://ai-engineer-2026-ten.vercel.app";

export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? DEFAULT_WEB_URL).replace(/\/$/, "");
