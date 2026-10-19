"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import { Card, CardTitle } from "@repo/ui/card";
import type { AuditResult } from "@repo/ai/audit";

const DEFAULT_FILENAME = "supabase.ts";

const DEFAULT_CODE = `"use client";

const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ?? "fake-service-role-key.not-a-real-secret";

const supabase = createClient("https://xyzcompany.supabase.co", SUPABASE_KEY);

export async function getAllUsers() {
  const { data } = await supabase.from("profiles").select("*");
  return data;
}
`;

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; result: AuditResult };

export function AuditForm() {
  const [filename, setFilename] = useState(DEFAULT_FILENAME);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [state, setState] = useState<State>({ status: "idle" });

  const loading = state.status === "loading";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, code }),
      });
      const data = await response.json();

      if (!response.ok) {
        setState({ status: "error", message: data.error ?? "The audit failed." });
        return;
      }

      setState({ status: "done", result: data as AuditResult });
    } catch {
      setState({ status: "error", message: "Could not reach the server. Check your connection." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="filename" className="text-sm font-medium text-white/70">
          File name
        </label>
        <input
          id="filename"
          name="filename"
          value={filename}
          onChange={(event) => setFilename(event.target.value)}
          className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 font-mono text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="code" className="text-sm font-medium text-white/70">
          Code
        </label>
        <textarea
          id="code"
          name="code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          rows={14}
          className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 font-mono text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Auditing…" : "Run audit"}
      </Button>

      {state.status === "loading" && (
        <Card className="animate-pulse">
          <CardTitle>Auditing…</CardTitle>
          <p className="mt-2 text-sm text-white/70">Claude is reading the file and checking for problems.</p>
        </Card>
      )}

      {state.status === "error" && (
        <Card role="alert" className="border-red-500/50">
          <CardTitle>Something went wrong</CardTitle>
          <p className="mt-2 text-sm text-red-300">{state.message}</p>
        </Card>
      )}

      {state.status === "done" && (
        <Card>
          <CardTitle>Findings</CardTitle>
          <p className="mt-2 text-sm text-white/50">
            {state.result.turns} turns · tools: {state.result.toolCalls.join(", ") || "none"} ·{" "}
            {state.result.usage.inputTokens} in / {state.result.usage.outputTokens} out tokens
          </p>
          <p className="mt-4 whitespace-pre-wrap text-sm text-white/90">{state.result.report}</p>
        </Card>
      )}
    </form>
  );
}
