import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LabNav } from "./lab-nav";

export const metadata: Metadata = {
  title: "Lab",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-zinc-950 text-zinc-100 antialiased">
        <LabNav />
        {children}
      </body>
    </html>
  );
}
