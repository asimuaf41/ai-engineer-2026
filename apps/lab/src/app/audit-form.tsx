"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
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

const FIELD_CLASS =
  "rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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
        <label htmlFor="filename" className="text-sm font-medium text-muted-foreground">
          File name
        </label>
        <input
          id="filename"
          name="filename"
          value={filename}
          onChange={(event) => setFilename(event.target.value)}
          className={FIELD_CLASS}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="code" className="text-sm font-medium text-muted-foreground">
          Code
        </label>
        <textarea
          id="code"
          name="code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          rows={14}
          className={FIELD_CLASS}
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Auditing…" : "Run audit"}
      </Button>

      {state.status === "loading" && (
        <Card className="animate-pulse">
          <CardHeader>
            <CardTitle>Auditing…</CardTitle>
            <CardDescription>Claude is reading the file and checking for problems.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {state.status === "error" && (
        <Card role="alert" className="ring-destructive/50">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription className="text-destructive">{state.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {state.status === "done" && (
        <Card>
          <CardHeader>
            <CardTitle>Findings</CardTitle>
            <CardDescription>
              {state.result.turns} turns · tools: {state.result.toolCalls.join(", ") || "none"} ·{" "}
              {state.result.usage.inputTokens} in / {state.result.usage.outputTokens} out tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-foreground">{state.result.report}</p>
          </CardContent>
        </Card>
      )}
    </form>
  );
}
