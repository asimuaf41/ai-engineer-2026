// Copies the color tokens from @repo/ui's globals.css into src/theme/tokens.css for Uniwind.
// The web apps and the mobile app then share one set of colors.
//   node scripts/sync-tokens.mjs           write src/theme/tokens.css
//   node scripts/sync-tokens.mjs --check   exit 1 if the file is out of date (used by check-types)
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const outFile = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "theme", "tokens.css");
const COLOR_START = /^(oklch\(|#|rgb|hsl)/;

// Returns the text between the braces of the first block that starts with `selector {`.
function readBlock(css, selector) {
  const match = new RegExp(`(^|\\n)${selector.replace(".", "\\.")}\\s*\\{`).exec(css);
  if (!match) throw new Error(`sync-tokens: no "${selector} { }" block found in @repo/ui globals.css`);
  const start = match.index + match[0].length;
  const end = css.indexOf("}", start);
  if (end === -1) throw new Error(`sync-tokens: the "${selector}" block in globals.css is not closed`);
  return css.slice(start, end);
}

// Keeps only color tokens (skips --radius and anything else that is not a color).
function readColors(css, selector) {
  const colors = [];
  for (const [, name, value] of readBlock(css, selector).matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    if (COLOR_START.test(value.trim())) colors.push([name, value.trim()]);
  }
  if (colors.length === 0) throw new Error(`sync-tokens: the "${selector}" block has no color tokens`);
  return colors;
}

function build() {
  // Drop comments first so a "}" or "--x: y;" inside a comment can't confuse the parser.
  // Quoted strings are kept as they are: globals.css has "dist/*.js", whose "/*" is not a comment.
  const css = readFileSync(require.resolve("@repo/ui/globals.css"), "utf8").replace(
    /("[^"\n]*")|\/\*[\s\S]*?\*\//g,
    (_match, quoted) => quoted ?? "",
  );
  const lines = (colors) => colors.map(([name, value]) => `      --color-${name}: ${value};`).join("\n");
  return `/* GENERATED from @repo/ui globals.css. Do not edit. Run: pnpm --filter mobile tokens */
@layer theme {
  :root {
    @variant light {
${lines(readColors(css, ":root"))}
    }
    @variant dark {
${lines(readColors(css, ".dark"))}
    }
  }
}
`;
}

const next = build();

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(outFile, "utf8");
  } catch {
    // Missing file counts as out of date.
  }
  if (current !== next) {
    console.error("tokens.css is out of date. Run: pnpm --filter mobile tokens");
    process.exit(1);
  }
  console.log("tokens.css is up to date.");
} else {
  writeFileSync(outFile, next);
  console.log(`Wrote ${outFile}`);
}
