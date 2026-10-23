import { ThemeProvider } from "@repo/ui/components/theme-provider";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LabNav } from "./lab-nav";

export const metadata: Metadata = {
  title: "Lab",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes adds the "dark" class to <html> before React loads.
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <ThemeProvider>
          <LabNav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
