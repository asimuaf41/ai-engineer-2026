"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import { Card, CardTitle } from "@repo/ui/card";
import { cn } from "@repo/ui/cn";
import { MAX_SCAN_CHARS, scanForSecrets, type Finding, type Severity } from "@/lib/secret-scan";
import { LEAKY_SAMPLE } from "@/lib/secret-samples";

const BADGE: Record<Severity, string> = {
  critical: "bg-red-500/20 text-red-300",
  high: "bg-amber-500/20 text-amber-300",
};

export function SecretScanForm() {
  const [text, setText] = useState(LEAKY_SAMPLE);
  // null = not scanned yet (or the text changed since the last scan)
  const [findings, setFindings] = useState<Finding[] | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFindings(scanForSecrets(text));
  }

  const critical = findings?.filter((finding) => finding.severity === "critical").length ?? 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="scan-text" className="text-sm font-medium text-white/70">
          Code or env file to scan
        </label>
        <textarea
          id="scan-text"
          name="scan-text"
          value={text}
          maxLength={MAX_SCAN_CHARS}
          onChange={(event) => {
            setText(event.target.value);
            setFindings(null);
          }}
          rows={14}
          className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 font-mono text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        />
        <p className="text-right text-xs text-white/50">
          {text.length.toLocaleString("en-US")} / {MAX_SCAN_CHARS.toLocaleString("en-US")} characters
        </p>
        {text.length >= MAX_SCAN_CHARS && (
          <p className="text-xs text-amber-300">
            Limit reached: only the first {MAX_SCAN_CHARS.toLocaleString("en-US")} characters are scanned. Scan the rest in a second paste.
          </p>
        )}
      </div>

      <Button type="submit">Scan for secrets</Button>

      {findings === null && (
        <p className="text-sm text-white/50">Click “Scan for secrets” to check the text above. Nothing leaves your browser.</p>
      )}

      {findings !== null && findings.length === 0 && (
        <Card role="status" className="border-green-500/50">
          <CardTitle className="text-green-300">No leaked secrets found</CardTitle>
          <p className="mt-2 text-sm text-white/70">This only checks a few common key types, so it is not a full guarantee.</p>
        </Card>
      )}

      {findings !== null && findings.length > 0 && (
        <Card role="alert" className="border-red-500/50">
          <CardTitle>
            {findings.length} {findings.length === 1 ? "leak" : "leaks"} found · {critical} critical
          </CardTitle>
          <ul className="mt-4 flex flex-col gap-4">
            {findings.map((finding, index) => (
              <li key={`${finding.ruleId}-${finding.line}-${index}`} className="flex flex-col gap-1 border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium uppercase", BADGE[finding.severity])}>
                    {finding.severity}
                  </span>
                  <span className="font-medium">{finding.title}</span>
                  <span className="text-sm text-white/50">line {finding.line}</span>
                </div>
                <code className="font-mono text-sm text-white/80">{finding.preview}</code>
                <p className="text-sm text-white/70">{finding.fix}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </form>
  );
}
