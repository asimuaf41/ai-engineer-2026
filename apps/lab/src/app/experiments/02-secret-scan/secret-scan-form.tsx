"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { MAX_SCAN_CHARS, scanForSecrets, type Finding } from "@/lib/secret-scan";
import { LEAKY_SAMPLE } from "@/lib/secret-samples";

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
        <label htmlFor="scan-text" className="text-sm font-medium text-muted-foreground">
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
          className="rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <p className="text-right text-xs text-muted-foreground">
          {text.length.toLocaleString("en-US")} / {MAX_SCAN_CHARS.toLocaleString("en-US")} characters
        </p>
        {text.length >= MAX_SCAN_CHARS && (
          <p className="text-xs text-medium">
            Limit reached: only the first {MAX_SCAN_CHARS.toLocaleString("en-US")} characters are scanned. Scan the rest in a second paste.
          </p>
        )}
      </div>

      <Button type="submit">Scan for secrets</Button>

      {findings === null && (
        <p className="text-sm text-muted-foreground">Click “Scan for secrets” to check the text above. Nothing leaves your browser.</p>
      )}

      {findings !== null && findings.length === 0 && (
        <Card role="status" className="ring-success/50">
          <CardHeader>
            <CardTitle className="text-success">No leaked secrets found</CardTitle>
            <CardDescription>This only checks a few common key types, so it is not a full guarantee.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {findings !== null && findings.length > 0 && (
        <Card role="alert" className="ring-destructive/50">
          <CardHeader>
            <CardTitle>
              {findings.length} {findings.length === 1 ? "leak" : "leaks"} found · {critical} critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-4">
              {findings.map((finding, index) => (
                <li key={`${finding.ruleId}-${finding.line}-${index}`} className="flex flex-col gap-1 border-t border-border pt-4 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={finding.severity} className="uppercase">
                      {finding.severity}
                    </Badge>
                    <span className="font-medium">{finding.title}</span>
                    <span className="text-sm text-muted-foreground">line {finding.line}</span>
                  </div>
                  <code className="font-mono text-sm text-foreground">{finding.preview}</code>
                  <p className="text-sm text-muted-foreground">{finding.fix}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </form>
  );
}
