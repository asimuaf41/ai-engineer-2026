import type { Metadata } from "next";
import type { ReactNode } from "react";
import { env } from "@/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: "Shipwright",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
