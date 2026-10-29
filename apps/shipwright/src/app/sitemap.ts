import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Public marketing pages only. The dashboard is private, and /design is an internal reference.
const PATHS = ["/", "/demo", "/ask"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({ url: new URL(path, SITE.url).toString() }));
}
