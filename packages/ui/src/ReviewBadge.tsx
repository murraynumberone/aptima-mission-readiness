import { Circle, CircleCheck, CircleSlash } from "lucide-react";

export type ReviewStatus = "unreviewed" | "confirmed" | "adjusted" | "dismissed";

// Review status is process, not severity: neutral color, shape and word. Adjusted is hand-drawn because Lucide has
// no clearly half-filled circle at this size.
function AdjustedIcon({ size }: { size: number }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" width={size} height={size} className="shrink-0">
      <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 1a5 5 0 0 0 0 10Z" fill="currentColor" />
    </svg>
  );
}

/** The shape alone, for places that supply their own label such as a radio option. Decorative: always show the word too. */
export function ReviewIcon({ status, size = 12 }: { status: ReviewStatus; size?: number }) {
  // The stroke stays 1.5px at any size, so small icons do not turn to hairlines.
  const props = {
    "aria-hidden": true,
    size,
    strokeWidth: 1.5,
    absoluteStrokeWidth: true,
    className: "shrink-0",
  } as const;
  if (status === "adjusted") return <AdjustedIcon size={size} />;
  if (status === "confirmed") return <CircleCheck {...props} />;
  if (status === "dismissed") return <CircleSlash {...props} />;
  return <Circle {...props} />;
}

/**
 * How far an event has been reviewed. Neutral color, never the status colors; use StatusBadge for severity.
 * The label is passed in so wording stays with the product copy.
 */
export function ReviewBadge({
  status,
  children,
  className = "",
}: {
  status: ReviewStatus;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs ${className}`}>
      <ReviewIcon status={status} />
      {children}
    </span>
  );
}
