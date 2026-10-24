import { ThemeProvider } from "@repo/ui/components/theme-provider";
import { MotionProvider } from "@repo/ui/motion/motion-provider";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { env } from "@/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: "Shipwright",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes adds the "dark" class to <html> before React loads.
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <ThemeProvider>
          <MotionProvider>
            <SiteHeader />
            {children}
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
