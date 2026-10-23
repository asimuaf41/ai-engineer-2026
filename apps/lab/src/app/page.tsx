import { AuditForm } from "./audit-form";

export default function Page() {
  return (
    <main className="container-page min-h-dvh py-16">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-full border border-border px-4 py-1 text-sm text-muted-foreground">
            AI Lab · experiment 01
          </span>
          <h1 className="text-h1 font-semibold">Security audit agent</h1>
          <p className="text-muted-foreground">Paste a file below and Claude will read it and list what it finds.</p>
        </div>
        <AuditForm />
      </div>
    </main>
  );
}
