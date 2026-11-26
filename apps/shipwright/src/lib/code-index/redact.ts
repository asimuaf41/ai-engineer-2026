// Masks secrets in repo text BEFORE it is mapped, chunked, embedded or stored. Pure: no I/O, no logging.
// The original text never leaves this function: the result holds only the masked text, a count and the kinds.
//
// The three key patterns are copied from the Day 3 secret scanner (.claude/hooks/guard-secrets.mjs, REAL_KEY).
// A unit test fails if the hook's pattern and these ever drift apart.
// On top of that, every value in a .env file is masked (a committed .env is the most common leak).

export type RedactResult = { text: string; count: number; kinds: string[] };

export const SECRET_PATTERNS = [
  { kind: "anthropic-key", pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g },
  { kind: "supabase-secret-key", pattern: /sb_secret_[A-Za-z0-9_-]{20,}/g },
  { kind: "stripe-live-key", pattern: /sk_live_[A-Za-z0-9]{20,}/g },
] as const;

const REDACTED = /^\[REDACTED:[a-z-]+\]$/;
// Values that are obviously not real. Short exact forms only: "your_real_prod_password_1" is NOT a placeholder.
const PLACEHOLDER =
  /^(?:<[^>]*>|your[-_ ]?(?:api[-_ ]?)?(?:key|token|secret|password)(?:[-_ ]?here)?|changeme|change[-_]me|replace[-_ ]?me|x{3,}|example|placeholder|todo|\.\.\.)$/i;
// KEY=value, with an optional "export".
const ENV_LINE = /^([ \t]*(?:export[ \t]+)?[A-Za-z_][A-Za-z0-9_.-]*[ \t]*=[ \t]*)(.*)$/;
const COMMENT_ONLY = /^\s*(?:#.*)?$/; // what may follow a closing quote

export function isEnvFilePath(path: string): boolean {
  const name = path.split("/").at(-1) ?? "";
  return name === ".env" || name.startsWith(".env.");
}

function kindOfKnownKey(value: string): string | null {
  for (const { kind, pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(value)) return kind;
  }
  return null;
}

// A value can be quoted, can have a trailing "# comment", and (in quotes) can run over several lines, like a private key.
// Everything that is part of the value is masked, including text after a closing quote. The line count never changes.
function maskEnvFile(text: string, found: (kind: string) => void): string {
  const out: string[] = [];
  let openQuote: string | null = null; // inside a quoted value that has not closed yet

  for (const raw of text.split("\n")) {
    const cr = raw.endsWith("\r") ? "\r" : "";
    const line = cr ? raw.slice(0, -1) : raw;

    if (openQuote !== null) {
      // Continuation of a multi-line value: the whole line belongs to the secret. Blank it (keeps line numbers).
      const close = line.indexOf(openQuote);
      if (close === -1) {
        out.push(cr);
      } else {
        const after = line.slice(close + 1);
        openQuote = null;
        out.push(COMMENT_ONLY.test(after) ? `${after}${cr}` : cr);
      }
      continue;
    }

    const match = /^\s*#/.test(line) ? null : ENV_LINE.exec(line);
    if (!match) {
      out.push(raw);
      continue;
    }
    const prefix = match[1] as string;
    const rest = match[2] as string;
    const quote = /^["'`]/.test(rest) ? (rest[0] as string) : null;

    if (quote === null) {
      // Unquoted: the value ends at " #" (a comment) or at the end of the line.
      const hash = rest.search(/\s#/);
      const value = (hash === -1 ? rest : rest.slice(0, hash)).trimEnd();
      if (value === "" || PLACEHOLDER.test(value) || REDACTED.test(value)) {
        out.push(raw);
        continue;
      }
      const kind = kindOfKnownKey(value) ?? "env-value";
      found(kind);
      out.push(`${prefix}[REDACTED:${kind}]${rest.slice(value.length)}${cr}`);
      continue;
    }

    const close = rest.indexOf(quote, 1);
    if (close === -1) {
      // The quote opens here and closes on a later line (a multi-line value). Mask this line and the ones that follow.
      found(kindOfKnownKey(rest) ?? "env-value");
      openQuote = quote;
      out.push(`${prefix}${quote}[REDACTED:env-value]${quote}${cr}`);
      continue;
    }
    const value = rest.slice(1, close);
    const after = rest.slice(close + 1);
    const clean = COMMENT_ONLY.test(after);
    if (clean && (value === "" || PLACEHOLDER.test(value) || REDACTED.test(value))) {
      out.push(raw);
      continue;
    }
    // Text right after the closing quote (A='abc'def) is part of the value too: mask it, never keep it.
    const kind = kindOfKnownKey(clean ? value : rest) ?? "env-value";
    found(kind);
    out.push(`${prefix}${quote}[REDACTED:${kind}]${quote}${clean ? after : ""}${cr}`);
  }
  return out.join("\n");
}

export function redactSecrets(text: string, options: { envFile?: boolean } = {}): RedactResult {
  let count = 0;
  const kinds = new Set<string>();
  let output = text;

  // Pass 1: .env files. Every value after "=" is masked, unless it is empty or an obvious placeholder.
  if (options.envFile) {
    output = maskEnvFile(output, (kind) => {
      count++;
      kinds.add(kind);
    });
  }

  // Pass 2: known key shapes anywhere in the text (code, config, markdown...).
  for (const { kind, pattern } of SECRET_PATTERNS) {
    output = output.replace(pattern, () => {
      count++;
      kinds.add(kind);
      return `[REDACTED:${kind}]`;
    });
  }

  return { text: output, count, kinds: [...kinds] };
}
