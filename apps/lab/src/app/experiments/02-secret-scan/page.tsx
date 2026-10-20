import type { Metadata } from "next";
import { SecretScanForm } from "./secret-scan-form";

export const metadata: Metadata = {
  title: "Secret leak scanner · AI Lab",
  description: "Paste code or an env file and find leaked keys. Nothing leaves your browser.",
};

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-10 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="rounded-full border border-white/15 px-4 py-1 text-sm text-white/70">
          AI Lab · experiment 02
        </span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Secret leak scanner</h1>
        <p className="text-white/70">
          Paste code or an env file and see which keys should never be there. Nothing leaves your browser.
        </p>
      </div>
      <SecretScanForm />
    </main>
  );
}
