import { ArrowLeftRight, Diamond, Triangle, type LucideIcon } from "lucide-react";
import type { EventKind } from "../../data/types";

// The marker shape tells event kinds apart without color: outlined diamond, solid diamond, solid triangle, two arrows.
const shapes: Record<EventKind, { Icon: LucideIcon; solid: boolean }> = {
  milestone: { Icon: Diamond, solid: false },
  "autonomy-flag": { Icon: Diamond, solid: true },
  "missed-alert": { Icon: Triangle, solid: true },
  handoff: { Icon: ArrowLeftRight, solid: false },
};

/** `size` is in pixels. The stroke stays 1.5px at any size, so small markers do not turn to hairlines. */
export function EventIcon({ kind, size = 12, className = "" }: { kind: EventKind; size?: number; className?: string }) {
  const { Icon, solid } = shapes[kind];
  return (
    <Icon
      aria-hidden
      size={size}
      strokeWidth={1.5}
      absoluteStrokeWidth
      fill={solid ? "currentColor" : "none"}
      className={`shrink-0 ${className}`.trim()}
    />
  );
}
