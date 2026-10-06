import { prefersReducedMotion } from "./motion";

export type ThemeChoice = "system" | "day" | "ops" | "night";
export type Theme = Exclude<ThemeChoice, "system">;

export const THEME_KEY = "mr-theme";
export const DIM_KEY = "mr-night-dim";
export const DIM_MIN = 40;
export const DIM_MAX = 100;
const TRANSITION_MS = 300;

export const themeChoices: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "day", label: "Day" },
  { value: "ops", label: "Ops" },
  { value: "night", label: "Night" },
];

const isChoice = (v: unknown): v is ThemeChoice => themeChoices.some((c) => c.value === v);

// localStorage can throw or be absent (private windows, blocked site data), so every access is guarded.
function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* the choice still applies for this visit */
  }
}

export const readChoice = (): ThemeChoice => {
  const v = read(THEME_KEY);
  return isChoice(v) ? v : "system";
};
export const writeChoice = (c: ThemeChoice) => write(THEME_KEY, c);

export function readDim(): number {
  const n = Number(read(DIM_KEY));
  return Number.isFinite(n) && n > 0 ? Math.min(DIM_MAX, Math.max(DIM_MIN, Math.round(n))) : DIM_MAX;
}
export const writeDim = (n: number) => write(DIM_KEY, String(n));

export const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

/** Night is opt-in only: "system" resolves to Day or Ops. */
export const resolveTheme = (choice: ThemeChoice, dark: boolean): Theme =>
  choice === "system" ? (dark ? "ops" : "day") : choice;

export function applyDim(percent: number) {
  document.documentElement.style.setProperty("--night-dim", String(percent / 100));
}

/**
 * Sets data-theme. Colors cross-fade unless reduced motion is on; only colors animate, so layout never moves.
 */
export function applyTheme(theme: Theme, { animate = false } = {}) {
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  if (animate && !prefersReducedMotion()) {
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), TRANSITION_MS);
  }
  root.dataset.theme = theme;
  // Keep the browser's own chrome (e.g. the address bar on phones) matching the app bar.
  const bar = getComputedStyle(root).getPropertyValue("--bar-bg").trim();
  if (bar) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bar);
}
