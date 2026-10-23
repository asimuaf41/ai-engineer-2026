// Checks WCAG contrast for the color tokens in src/styles/globals.css.
// Plain Node, no dependencies. Usage: pnpm --filter @repo/ui check-contrast
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cssPath = fileURLToPath(new URL("../src/styles/globals.css", import.meta.url));
const css = readFileSync(cssPath, "utf8");

// Pull "--name: oklch(...)" lines out of one CSS block (":root {" or ".dark {").
function readTokens(selectorPattern) {
  const block = css.match(new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`));
  if (!block) throw new Error(`Block not found: ${selectorPattern}`);
  const tokens = {};
  for (const m of block[1].matchAll(/--([\w-]+)\s*:\s*oklch\(([^)]+)\)\s*;/g)) {
    tokens[m[1]] = parseOklch(m[2]);
  }
  return tokens;
}

// "0.5 0.1 268" or "1 0 0 / 9%" -> { l, c, h, alpha }
function parseOklch(text) {
  const [color, alphaPart] = text.split("/").map((s) => s.trim());
  const [l, c, h] = color.split(/\s+/).map((v) => (v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v)));
  const alpha = alphaPart === undefined ? 1 : alphaPart.endsWith("%") ? parseFloat(alphaPart) / 100 : parseFloat(alphaPart);
  return { l, c, h, alpha };
}

const clamp01 = (n) => Math.min(1, Math.max(0, n));

// OKLCH -> OKLab -> linear sRGB (clamped to 0..1)
function oklchToLinear({ l, c, h }) {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ].map(clamp01);
}

const encode = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const decode = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

// Colors are handled as gamma-encoded sRGB triples so blending matches what a browser does.
const toSrgb = (token) => oklchToLinear(token).map(encode);

// Put `top` (with opacity `alpha`) over `bottom`, in sRGB.
const blend = (top, bottom, alpha) => top.map((v, i) => v * alpha + bottom[i] * (1 - alpha));

function luminance(srgb) {
  const [r, g, b] = srgb.map(decode);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const SEVERITIES = ["critical", "high", "medium", "low", "success"];
let failures = 0;

function check(theme, label, fg, bg, min) {
  const ratio = contrast(fg, bg);
  const ok = ratio >= min;
  if (!ok) failures += 1;
  console.log(`${ok ? "pass" : "FAIL"} ${ratio.toFixed(2).padStart(5)} (${min}) [${theme}] ${label}`);
}

function checkTheme(theme, tokens) {
  const bgBase = toSrgb(tokens.background);
  // Colors with alpha (like borders) are flattened over the page background.
  const color = (name) => {
    const t = tokens[name];
    if (!t) throw new Error(`Missing token --${name} in ${theme}`);
    const srgb = toSrgb(t);
    return t.alpha < 1 ? blend(srgb, bgBase, t.alpha) : srgb;
  };

  const pairs = [
    ["foreground / background", "foreground", "background"],
    ["card-foreground / card", "card-foreground", "card"],
    ["popover-foreground / popover", "popover-foreground", "popover"],
    ["primary-foreground / primary", "primary-foreground", "primary"],
    ["secondary-foreground / secondary", "secondary-foreground", "secondary"],
    ["muted-foreground / background", "muted-foreground", "background"],
    ["muted-foreground / card", "muted-foreground", "card"],
    ["muted-foreground / muted", "muted-foreground", "muted"],
    ["accent-foreground / accent", "accent-foreground", "accent"],
    ["brand-foreground / brand", "brand-foreground", "brand"],
    ["brand / background", "brand", "background"],
    ["destructive / background", "destructive", "background"],
  ];
  for (const [label, fg, bg] of pairs) check(theme, label, color(fg), color(bg), 4.5);

  check(theme, "ring / background", color("ring"), color("background"), 3);

  // Severity text sits on a light tint of its own color (like a badge), over card and background.
  for (const name of SEVERITIES) {
    for (const surface of ["card", "background"]) {
      const text = color(name);
      const tint = blend(text, color(surface), 0.12);
      check(theme, `${name} on 12% tint over ${surface}`, text, tint, 4.5);
    }
  }
}

checkTheme("light", readTokens(":root"));
console.log("");
checkTheme("dark", readTokens("\\.dark"));

if (failures > 0) {
  console.error(`\n${failures} contrast check(s) failed.`);
  process.exit(1);
}
console.log("\nAll contrast checks passed.");
