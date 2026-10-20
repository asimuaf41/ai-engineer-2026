export type Severity = "critical" | "high";

export type Finding = {
  ruleId: string;
  title: string;
  severity: Severity;
  /** 1-based line number */
  line: number;
  /** masked: first 8 chars + "…" + length (NEXT_PUBLIC_ names are shown as they are) */
  preview: string;
  fix: string;
};

export const MAX_SCAN_CHARS = 50_000;

type Rule = {
  id: string;
  title: string;
  severity: Severity;
  pattern: RegExp;
  fix: string;
  /** Return false to ignore a match (used by the JWT rule). */
  accept?: (match: RegExpMatchArray) => boolean;
  /** Show the match as it is instead of masking it. */
  showPlain?: boolean;
};

const ROTATE = "Rotate (replace) this key in the provider's dashboard now, then keep the new one only in server environment variables.";

/** Decode the middle part of a JWT. Returns undefined for anything that is not valid. */
function jwtRole(payload: string | undefined): string | undefined {
  if (!payload) return undefined;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const parsed: unknown = JSON.parse(atob(padded));
    if (typeof parsed === "object" && parsed !== null && "role" in parsed) {
      const role = (parsed as { role: unknown }).role;
      return typeof role === "string" ? role : undefined;
    }
    return undefined;
  } catch {
    // Not a real JWT — it is simply not a finding.
    return undefined;
  }
}

const RULES: readonly Rule[] = [
  {
    id: "anthropic-key",
    title: "Anthropic API key",
    severity: "critical",
    pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g,
    fix: `${ROTATE} Anyone with this key can spend your Anthropic credit.`,
  },
  {
    id: "openai-key",
    title: "OpenAI API key",
    severity: "critical",
    pattern: /sk-proj-[A-Za-z0-9_-]{20,}/g,
    fix: `${ROTATE} Anyone with this key can spend your OpenAI credit.`,
  },
  {
    id: "stripe-live-key",
    title: "Stripe live secret key",
    severity: "critical",
    pattern: /sk_live_[A-Za-z0-9]{20,}/g,
    fix: `${ROTATE} This key can move real money, so roll it in the Stripe dashboard first.`,
  },
  {
    id: "supabase-secret-key",
    title: "Supabase secret key",
    severity: "critical",
    pattern: /sb_secret_[A-Za-z0-9_-]{20,}/g,
    fix: `${ROTATE} This key bypasses all your database security rules.`,
  },
  {
    id: "supabase-service-role-jwt",
    title: "Supabase service_role key (legacy JWT)",
    severity: "critical",
    pattern: /eyJ[A-Za-z0-9_-]{5,}\.(eyJ[A-Za-z0-9_-]{5,})\.[A-Za-z0-9_-]{5,}/g,
    accept: (match) => jwtRole(match[1]) === "service_role",
    fix: `${ROTATE} This key bypasses all your database security rules.`,
  },
  {
    id: "github-token",
    title: "GitHub access token",
    severity: "critical",
    pattern: /(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g,
    fix: "Delete this token in your GitHub settings now and create a new one; keep it only in server environment variables.",
  },
  {
    id: "private-key-block",
    title: "Private key (PEM block)",
    severity: "critical",
    pattern: /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/g,
    fix: "Treat this key as stolen: generate a new key pair, replace it everywhere, and store the new private key outside your code.",
  },
  {
    id: "public-env-secret",
    title: "Secret-looking name exposed with NEXT_PUBLIC_",
    severity: "high",
    pattern: /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE|API_KEY|TOKEN)[A-Z0-9_]*/g,
    showPlain: true,
    fix: "Anything starting with NEXT_PUBLIC_ is sent to every visitor's browser, so rename it without that prefix and move it to server env.",
  },
];

function mask(value: string): string {
  return `${value.slice(0, 8)}…${value.length}`;
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1 };

export function scanForSecrets(text: string): Finding[] {
  const lines = text.slice(0, MAX_SCAN_CHARS).split(/\r\n|\r|\n/);
  const findings: Finding[] = [];
  const seen = new Set<string>();

  lines.forEach((lineText, index) => {
    for (const rule of RULES) {
      for (const match of lineText.matchAll(rule.pattern)) {
        if (rule.accept && !rule.accept(match)) continue;
        const key = `${rule.id}:${index}:${match[0]}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({
          ruleId: rule.id,
          title: rule.title,
          severity: rule.severity,
          line: index + 1,
          preview: rule.showPlain ? match[0] : mask(match[0]),
          fix: rule.fix,
        });
      }
    }
  });

  return findings.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.line - b.line,
  );
}
