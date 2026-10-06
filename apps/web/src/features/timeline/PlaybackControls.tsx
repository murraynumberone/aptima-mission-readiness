import { useState } from "react";
import { Button } from "@mission-readiness/ui";
import { IconCheckDraw, IconSwap } from "../../app/AnimatedIcon";
import { IconAddNote, IconEnd, IconLink, IconLive, IconNext, IconPause, IconPlay, IconPrevious } from "../../app/icons";
import { SwapLabel } from "../../app/SwapLabel";
import type { Run } from "../../data/types";
import { useClock, useClockActions } from "../../lib/clock-react";
import { formatClock, formatIsoDuration, formatSpoken } from "../../lib/format";
import { latestEventAt } from "../../lib/metrics";
import { nextEvent, previousEvent } from "../../lib/timeline";
import { writeUrlState } from "../../lib/url-state";
import { FeedStatus } from "./FeedStatus";
import { Scrubber } from "./Scrubber";

export function PlaybackControls({ run, onAddNote }: { run: Run; onAddNote: () => void }) {
  const clock = useClockActions();
  const time = useClock((s) => Math.floor(s.time));
  const edge = useClock((s) => Math.floor(s.edge));
  const playing = useClock((s) => s.playing);
  const latest = useClock((s) => latestEventAt(run, s.time)?.id);
  const event = run.events.find((e) => e.id === latest);
  const prev = useClock((s) => previousEvent(run, s.time)?.id);
  const next = useClock((s) => nextEvent(run, s.time, s.edge)?.id);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const copyLink = async () => {
    // Make the address say exactly this moment (it only updates when you move the timeline), then copy it.
    const link = writeUrlState({ time: clock.getState().time });
    try {
      await navigator.clipboard.writeText(link);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
    window.setTimeout(() => setCopy("idle"), 2500);
  };
  const copyLabel = { idle: "Copy link", copied: "Link copied", failed: "Couldn't copy" }[copy];
  const jump = (id: string | undefined) => {
    const e = run.events.find((x) => x.id === id);
    if (e) clock.seek(e.t);
  };

  return (
    <section aria-labelledby="playback-heading" className="mt-5">
      <h2 id="playback-heading" className="sr-only">
        Playback
      </h2>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant="primary" onClick={clock.toggle}>
          <IconSwap swapKey={playing ? "pause" : "play"}>{playing ? <IconPause /> : <IconPlay />}</IconSwap>
          <SwapLabel show={playing ? "Pause" : "Play"} options={["Play", "Pause"]} />
        </Button>
        <Button onClick={() => jump(prev)} disabled={!prev}>
          <IconPrevious className="nudge-l" />
          Previous event
        </Button>
        <Button onClick={() => jump(next)} disabled={!next}>
          <IconNext className="nudge-r" />
          Next event
        </Button>
        <Button onClick={clock.goLive} disabled={time >= edge}>
          {edge >= run.durationSec ? <IconEnd /> : <IconLive />}
          <SwapLabel show={edge >= run.durationSec ? "Go to end" : "Go live"} options={["Go live", "Go to end"]} />
        </Button>
        <Button onClick={onAddNote}>
          <IconAddNote />
          Add note
        </Button>
        <Button onClick={copyLink}>
          <IconSwap swapKey={copy}>{copy === "copied" ? <IconCheckDraw /> : <IconLink />}</IconSwap>
          <SwapLabel show={copyLabel} options={["Copy link", "Link copied", "Couldn't copy"]} />
        </Button>
        <p role="status" className="sr-only">
          {copy === "copied" ? "Link to this moment copied." : copy === "failed" ? "Couldn't copy the link." : ""}
        </p>
      </div>
      {/* mt-8 leaves room above the track for the drag tooltip */}
      <div className="mt-8">
        <Scrubber run={run} />
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xs text-muted-foreground">
          {event ? (
            <>
              Latest event <span className="font-mono">{formatClock(event.t)}</span>: <span>{event.title}</span>
            </>
          ) : (
            "No events before this moment. Drag the timeline or jump to the next event."
          )}
        </p>
        <div className="flex items-center gap-4">
          <FeedStatus />
          <p className="font-mono text-xs tabular-nums">
            <time
              dateTime={formatIsoDuration(time)}
              aria-label={`${formatSpoken(time)} elapsed`}
              className="text-base font-medium"
            >
              {formatClock(time)}
            </time>
            <span className="text-muted-foreground">
              {" / "}
              <time dateTime={formatIsoDuration(run.durationSec)} aria-label={`${formatSpoken(run.durationSec)} total`}>
                {formatClock(run.durationSec)}
              </time>
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
