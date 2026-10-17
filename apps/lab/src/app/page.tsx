import { AuditForm } from "./audit-form";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-10 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="rounded-full border border-white/15 px-4 py-1 text-sm text-white/70">
          AI Lab · experiment 01
        </span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Security audit agent</h1>
        <p className="text-white/70">Paste a file below and Claude will read it and list what it finds.</p>
      </div>
      <AuditForm />
    </main>
  );
}
