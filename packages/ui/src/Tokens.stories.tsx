import type { Meta, StoryObj } from "@storybook/react-vite";

const swatches = [
  ["bg", "Page"],
  ["surface", "Surface"],
  ["fill-subtle", "Subtle fill"],
  ["line", "Line"],
  ["muted-foreground", "Muted text"],
  ["surface-foreground", "Text"],
  ["accent", "Accent"],
  ["focus-ring", "Focus ring"],
  ["status-nominal", "Nominal"],
  ["status-attention", "Attention"],
  ["status-critical", "Critical"],
] as const;

const meta = { title: "Foundations/Colors", parameters: { a11y: { test: "off" } } } satisfies Meta;
export default meta;

// Values come from the live CSS variables, so the swatches follow the theme in the toolbar. Contrast is checked by
// `pnpm --filter @mission-readiness/tokens check`.
export const Tokens: StoryObj = {
  render: () => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {swatches.map(([token, name]) => (
        <div key={token} className="panel p-3">
          <div className="h-10 rounded-(--radius) border border-line" style={{ background: `var(--${token})` }} />
          <p className="mt-2 text-sm font-medium">{name}</p>
          <p className="label">--{token}</p>
        </div>
      ))}
    </div>
  ),
};

export const Type: StoryObj = {
  render: () => (
    <div className="grid gap-2">
      <p className="label">Label · mono caps</p>
      <p className="text-sm">Body 15px: Operator 03 is at 61%, below the 72% attention line.</p>
      <p className="text-xs text-muted-foreground">Secondary 13px: Score fell 79 to 61.</p>
      <p className="font-mono text-xs tabular-nums">Data 13px mono: 9:00 / 30:00 · 61%</p>
    </div>
  ),
};
