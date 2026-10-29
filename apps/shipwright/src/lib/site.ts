import { env } from "@/env";

// Where the site lives, in this order: the URL we set by hand, Vercel's production domain, localhost.
// Link previews (og:image) need an absolute URL, so a wrong value here breaks the preview card.
const url = (
  env.NEXT_PUBLIC_APP_URL ??
  (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE = {
  name: "Shipwright",
  description:
    "Shipwright scans your AI-built app for security, database, payment and cost problems, and tells you exactly what to fix before launch.",
  url,
} as const;

export const DEFAULT_TITLE = "Shipwright: take your AI-built app to production";
