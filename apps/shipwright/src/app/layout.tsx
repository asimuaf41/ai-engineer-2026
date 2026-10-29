import { ThemeProvider } from "@repo/ui/components/theme-provider";
import { MotionProvider } from "@repo/ui/motion/motion-provider";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DEFAULT_TITLE, SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  // Makes relative URLs (like the og:image) absolute, which link previews require.
  metadataBase: new URL(SITE.url),
  title: { default: DEFAULT_TITLE, template: "%s · Shipwright" },
  description: SITE.description,
  // "./" gives every page its own canonical URL (relative to metadataBase).
  alternates: { canonical: "./" },
  // No title, description or url here on purpose: set at the root, every page would inherit the home
  // page's text and address in its link preview. Next fills title and description in from each page.
  openGraph: { type: "website", siteName: SITE.name },
  twitter: { card: "summary_large_image" },
};

// The one place hex is OK: browsers need a real color string for the address bar, not a CSS variable.
// Values are our --background token (light and dark) converted from oklch.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfcfd" },
    { media: "(prefers-color-scheme: dark)", color: "#090a0e" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes adds the "dark" class to <html> before React loads.
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        {/* First thing a keyboard user reaches: it stays hidden until focused, then jumps past the header. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <MotionProvider>
            {children}
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
