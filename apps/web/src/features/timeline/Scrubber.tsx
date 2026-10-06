import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Slider } from "@base-ui/react/slider";
import { Tooltip } from "@base-ui/react/tooltip";
import type { Run } from "../../data/types";
import { useClock, useClockActions } from "../../lib/clock-react";
import { formatClock } from "../../lib/format";
import { describeValue, eventAt, nextEvent, previousEvent, snapToEvent } from "../../lib/timeline";
import { EventIcon } from "./EventIcon";

const SMALL_STEP_SEC = 1;
const LARGE_STEP_SEC = 10;
/** From the thumb to the tooltip, enough to clear the row of event icons above the track. */
const TOOLTIP_CLEARS_MARKERS_PX = 34;

export function Scrubber({ run }: { run: Run }) {
  const clock = useClockActions();
  const time = useClock((s) => Math.floor(s.time));
  const edge = useClock((s) => Math.floor(s.edge));
  const wasPlaying = useRef(false);
  const thumb = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const percent = (t: number) => `${(t / run.durationSec) * 100}%`;
  const here = eventAt(run, time);

  // Snap only for pointer input. Snapping keyboard steps would trap the thumb beside a marker.
  const onChange = (value: number, reason: string) => {
    const pointer = reason === "drag" || reason === "track-press";
    const target = pointer ? snapToEvent(run, value, clock.getState().edge) : undefined;
    clock.seek(target ? target.t : value);
  };

  // Pause while dragging so playback doesn't fight the thumb, then resume if it was playing.
  const onPointerDown = () => {
    wasPlaying.current = clock.getState().playing;
    clock.pause();
    setDragging(true);
  };

  // A release anywhere, even outside the window, ends the drag.
  useEffect(() => {
    if (!dragging) return;
    const stop = () => setDragging(false);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragging]);
  const onCommit = (_: number, details: { reason: string }) => {
    if (details.reason !== "keyboard" && wasPlaying.current) clock.play();
    wasPlaying.current = false;
  };

  // [ and ] jump between events. Only active while the slider has focus (WCAG 2.1.4).
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const { time: t, edge: edgeNow } = clock.getState();
    const target = e.key === "]" ? nextEvent(run, t, edgeNow) : e.key === "[" ? previousEvent(run, t) : undefined;
    if (e.key === "]" || e.key === "[") e.preventDefault();
    if (target) clock.seek(target.t);
  };

  return (
    // [ and ] reach this wrapper from the slider inside it.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div onKeyDown={onKeyDown}>
      <Slider.Root
        value={time}
        min={0}
        max={run.durationSec}
        step={SMALL_STEP_SEC}
        largeStep={LARGE_STEP_SEC}
        onValueChange={(v, d) => onChange(v, d.reason)}
        onValueCommitted={onCommit}
        onPointerDown={onPointerDown}
      >
        <Slider.Control
          data-testid="scrubber"
          className="relative flex h-14 w-full touch-none items-center pt-6 select-none"
        >
          <Slider.Track className="relative h-px w-full bg-line">
            <Slider.Indicator className="h-px bg-surface-foreground" />
            {/* Time that hasn't happened yet: hatched, and the thumb can't enter it. */}
            <div
              aria-hidden
              className="pointer-events-none absolute top-1/2 h-2 -translate-y-1/2"
              style={{
                left: percent(edge),
                right: 0,
                backgroundImage: "repeating-linear-gradient(90deg, var(--line) 0 1px, transparent 1px 6px)",
              }}
            />
            <Slider.Thumb
              ref={thumb}
              aria-label="Exercise timeline"
              getAriaValueText={(_, v) => describeValue(run, v)}
              onFocus={(e) => setFocused((e.target as HTMLElement).matches(":focus-visible"))}
              onBlur={() => setFocused(false)}
              className="top-1/2 size-4 -translate-y-1/2 rounded-(--radius) border-2 border-surface-foreground bg-surface has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus-ring"
            />
          </Slider.Track>

          {run.events
            .filter((e) => e.t <= edge)
            .map((e) => (
              <button
                key={e.id}
                type="button"
                tabIndex={-1}
                aria-label={`Jump to ${formatClock(e.t)}: ${e.title}`}
                onClick={() => clock.seek(e.t)}
                className="absolute top-0 flex size-6 -translate-x-1/2 items-center justify-center text-muted-foreground hover:text-surface-foreground"
                style={{ left: percent(e.t) }}
              >
                <EventIcon kind={e.kind} size={14} />
              </button>
            ))}
        </Slider.Control>
      </Slider.Root>
      {/* Time while dragging or keyboard-focused, positioned against the thumb and flipped or wrapped to stay on screen. Decorative: the slider's value text is what screen readers announce. */}
      <Tooltip.Root open={dragging || focused}>
        <Tooltip.Portal>
          <Tooltip.Positioner
            anchor={thumb}
            side="top"
            align="center"
            sideOffset={({ side }) => (side === "top" ? TOOLTIP_CLEARS_MARKERS_PX : 10)}
            collisionPadding={8}
            className="z-50"
          >
            <Tooltip.Popup
              aria-hidden
              data-testid="scrubber-tooltip"
              className="pointer-events-none max-w-(--available-width) rounded-(--radius) border border-line bg-surface px-2 py-0.5 text-center font-mono text-xs"
            >
              {formatClock(time)}
              {here ? ` · ${here.title}` : ""}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </div>
  );
}
