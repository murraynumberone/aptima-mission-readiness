import { IconLive, IconPause, IconReplay, IconSave } from "../../app/icons";
import { useClock } from "../../lib/clock-react";
import { formatClock } from "../../lib/format";

// The widest this text gets (59:59 behind live). Reserved invisibly so the text changing never moves what is beside it.
const WIDEST = "Replay · 59:59 behind live";

/**
 * Whether the moment on screen is the newest data. Icon plus word, never color alone. The gap changes only
 * when the user moves, so this is not a live region.
 */
export function FeedStatus() {
  const behind = useClock((s) => Math.floor(s.edge) - Math.floor(s.time));
  const complete = useClock((s) => s.edge >= s.duration);
  const playing = useClock((s) => s.playing);

  const { Icon, label } =
    behind >= 1
      ? { Icon: IconReplay, label: complete ? "Replay" : `Replay · ${formatClock(behind)} behind live` }
      : complete
        ? { Icon: IconSave, label: "Complete" }
        : playing
          ? { Icon: IconLive, label: "Live" }
          : { Icon: IconPause, label: "Paused" };

  return (
    <span className="inline-grid font-mono text-xs font-medium">
      <span aria-hidden className="invisible col-start-1 row-start-1 flex items-center gap-1.5">
        <span className="size-3.5" />
        {WIDEST}
      </span>
      <span data-testid="feed-status" className="col-start-1 row-start-1 flex items-center justify-end gap-1.5">
        <Icon />
        {label}
      </span>
    </span>
  );
}
