/** Nominal is on track, attention is below the attention line, critical is below the critical line. */
export type Status = "nominal" | "attention" | "critical";

// Shape and label carry status; color only reinforces it, so it works in Night. Outlined = nominal, half =
// attention, solid = critical. CSS-drawn.
const config: Record<Status, { label: string; color: string; fill: string; weight: string }> = {
  nominal: { label: "Nominal", color: "text-status-nominal", fill: "", weight: "" },
  attention: {
    label: "Attention",
    color: "text-status-attention",
    fill: "bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)]",
    weight: "font-semibold",
  },
  critical: { label: "Critical", color: "text-status-critical", fill: "bg-current", weight: "font-bold" },
};

/** Severity of an operator or measure. For process state such as review progress use ReviewBadge. */
export function StatusBadge({ status }: { status: Status }) {
  const { label, color, fill, weight } = config[status];
  return (
    <span className={`inline-flex items-center gap-2 font-mono text-xs ${weight}`}>
      <span aria-hidden className={`size-2.5 rounded-full border-[1.5px] border-current ${color} ${fill}`} />
      <span>{label}</span>
    </span>
  );
}
