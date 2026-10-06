// Verifies WCAG contrast for each theme's token pairs. Run: pnpm --filter @mission-readiness/tokens check
import fs from "node:fs";

const css = fs.readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const themes = {};
for (const m of css.matchAll(/\[data-theme="(\w+)"\]\s*\{([^}]*)\}/g)) {
  themes[m[1]] = Object.fromEntries([...m[2].matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/g)].map((x) => [x[1], x[2]]));
}

const lum = (h) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background, required ratio]: 4.5 for text, 3 for non-text and large text. Muted text never sits on
// fill-subtle, so that pair is not checked. Status tokens color markers only, so they need 3.
const checks = [
  ["surface-foreground", "bg", 4.5],
  ["surface-foreground", "surface", 4.5],
  ["muted-foreground", "bg", 4.5],
  ["muted-foreground", "surface", 4.5],
  ["accent-text", "bg", 4.5],
  ["accent-text", "surface", 4.5],
  ["status-nominal", "surface", 3],
  ["status-attention", "surface", 3],
  ["status-critical", "surface", 3],
  ["focus-ring", "bg", 3],
  ["focus-ring", "surface", 3],
  ["accent", "surface", 3],
  // The app bar and the logo drawn on it.
  ["bar-foreground", "bar-bg", 4.5],
  ["bar-muted", "bar-bg", 4.5],
  ["bar-foreground", "bar-fill", 4.5],
  ["bar-focus-ring", "bar-bg", 3],
  ["logo-mark", "bar-bg", 3],
  ["logo-word", "bar-bg", 3],
];

const isRed = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return r > 150 && g < 80 && b < 80;
};

let failed = 0;
for (const [name, t] of Object.entries(themes)) {
  for (const [fg, bg, need0] of checks) {
    const need = need0;
    const r = ratio(t[fg], t[bg]);
    const ok = r >= need;
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(5)} ${fg} on ${bg}: ${r.toFixed(2)} (need ${need})`);
  }
}
// The logo is tinted per theme: brand colors in Day and Ops, the red palette in Night.
const logoChecks = [
  ["day", "logo-mark is brand Signal Orange", themes.day["logo-mark"] === "#f05e2b"],
  ["day", "logo-word is white", themes.day["logo-word"] === "#ffffff"],
  ["ops", "logo-mark is brand Signal Orange", themes.ops["logo-mark"] === "#f05e2b"],
  ["ops", "logo-word is white", themes.ops["logo-word"] === "#ffffff"],
  ["night", "logo-mark is the Night text color", themes.night["logo-mark"] === themes.night["surface-foreground"]],
  ["night", "logo-word is red, not white", isRed(themes.night["logo-word"])],
];
for (const [name, label, ok] of logoChecks) {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(5)} ${label}`);
}

process.exit(failed ? 1 : 0);
