// Turns a workspace name into the short address people see in the URL: "Acme Labs" -> "acme-labs-x7k2".
// The database enforces the same rule (a check on orgs.slug), so a slug made here always fits it. Pure code.

// The same pattern as the database check: starts and ends with a letter or digit, letters, digits and dashes in between.
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

const MAX_BASE_LENGTH = 30;
const SUFFIX_LENGTH = 4;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

// "Acme Labs!" -> "acme-labs". Accents are removed ("Café" -> "cafe"). A name with nothing usable in it
// (for example one written only in another alphabet) becomes "workspace".
export function slugify(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_BASE_LENGTH)
    // Cutting at 30 characters can leave a dash at the end.
    .replace(/-+$/g, "");
  return base || "workspace";
}

// Four random letters or digits, so two workspaces called "Acme" don't fight over one address.
export function randomSuffix(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(SUFFIX_LENGTH));
  return Array.from(bytes, (byte) => ALPHABET.charAt(byte % ALPHABET.length)).join("");
}

export const makeSlug = (name: string, suffix: string = randomSuffix()): string => `${slugify(name)}-${suffix}`;
