import { useEffect, useState } from "react";
import type { Run } from "../../data/types";
import { useClock, useClockActions } from "../../lib/clock-react";
import { summarizeMoment } from "../../lib/timeline";

/** Wait for scrubbing to settle before speaking, so a drag produces one announcement, not fifty. */
export const SETTLE_MS = 600;

/**
 * The one polite live region: announces after the user moves the timeline, never on playback ticks, never
 * moves focus.
 */
export function LiveSummary({ run }: { run: Run }) {
  const clock = useClockActions();
  const seeks = useClock((s) => s.seeks);
  const [text, setText] = useState("");

  useEffect(() => {
    if (seeks === 0) return;
    const id = setTimeout(() => setText(summarizeMoment(run, clock.getState().time)), SETTLE_MS);
    return () => clearTimeout(id);
  }, [seeks, run, clock]);

  return (
    <p role="status" aria-label="Timeline summary" className="sr-only">
      {text}
    </p>
  );
}
