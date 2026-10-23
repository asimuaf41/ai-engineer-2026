import type { Metadata } from "next";
import { SecretScanForm } from "./secret-scan-form";

export const metadata: Metadata = {
  title: "Secret leak scanner · AI Lab",
  description: "Paste code or an env file and find leaked keys. Nothing leaves your browser.",
};

export default function Page() {
  return (
    <main className="container-page min-h-dvh py-16">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-full border border-border px-4 py-1 text-sm text-muted-foreground">
            AI Lab · experiment 02
          </span>
          <h1 className="text-h1 font-semibold">Secret leak scanner</h1>
          <p className="text-muted-foreground">
            Paste code or an env file and see which keys should never be there. Nothing leaves your browser.
          </p>
        </div>
        <SecretScanForm />
      </div>
    </main>
  );
}
