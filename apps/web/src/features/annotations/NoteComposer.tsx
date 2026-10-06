import { useRef, useState } from "react";
import { Button, Textarea } from "@mission-readiness/ui";
import { IconLive, IconSave } from "../../app/icons";
import type { Run } from "../../data/types";
import { useAnnotationActions, useDebrief } from "../../lib/annotations-react";
import { useClock, useClockActions } from "../../lib/clock-react";
import { formatClock, formatIsoDuration } from "../../lib/format";
import { eventAt } from "../../lib/timeline";
import { useUnsavedWarning } from "../../lib/use-unsaved-warning";
import { ReviewControl } from "./ReviewControl";

interface Props {
  run: Run;
  /** Latest confirmation, shown in place beside the Save button. */
  message: string;
  onMessage: (message: string) => void;
}

/** Writes a note for the current moment, and reviews the event if the moment is on one. */
export function NoteComposer({ run, message, onMessage }: Props) {
  const store = useAnnotationActions();
  const clock = useClockActions();
  const now = useClock((s) => Math.floor(s.time));
  const seeks = useClock((s) => s.seeks);
  const input = useRef<HTMLTextAreaElement>(null);
  const [lastSeeks, setLastSeeks] = useState(seeks);
  const [text, setText] = useState("");
  const [held, setHeld] = useState<number | null>(null);
  const [error, setError] = useState(false);
  useUnsavedWarning(text.trim() !== ""); // a half-written note is easy to lose to a reload

  // Jumping to an event holds the composer on it, so a running clock cannot tick past before it is reviewed.
  // Adjusted while rendering, not in an effect.
  if (seeks !== lastSeeks) {
    setLastSeeks(seeks);
    if (!text.trim()) {
      // mid-note: the note keeps its moment
      const target = Math.floor(clock.getState().seekedTo);
      setHeld(eventAt(run, target) ? target : null);
    }
  }

  // Typing also holds the moment, so the note keeps the time it was started at.
  const at = held ?? now;
  const drifted = held !== null && held !== now;
  const event = eventAt(run, at);
  const status = useDebrief((s) => (event ? (s.reviews[event.id]?.status ?? "unreviewed") : "unreviewed"));

  const onText = (value: string) => {
    setText(value);
    if (value && held === null) setHeld(now);
    setError(false);
    if (message) onMessage("");
  };

  const save = () => {
    if (!text.trim()) {
      setError(true);
      input.current?.focus();
      return;
    }
    store.add({ t: at, text, eventId: event?.id });
    setText("");
    if (!event) setHeld(null); // an event stays selected so its review can continue
    onMessage(`Note saved at ${formatClock(at)}.`);
  };

  return (
    <div>
      <p className="text-sm">
        Note for{" "}
        <time className="font-mono font-medium tabular-nums" dateTime={formatIsoDuration(at)}>
          {formatClock(at)}
        </time>
        <span className="text-muted-foreground">
          {" · "}
          {event ? event.title : "no event at this moment"}
        </span>
        {drifted && (
          <span className="text-muted-foreground">
            {" · "}held, clock is at{" "}
            <time className="font-mono tabular-nums" dateTime={formatIsoDuration(now)}>
              {formatClock(now)}
            </time>
          </span>
        )}
        {drifted && !text && (
          <Button className="ml-2" onClick={() => setHeld(null)}>
            <IconLive />
            Follow clock
          </Button>
        )}
      </p>

      {event && (
        <div className="mt-2">
          <ReviewControl
            eventId={event.id}
            status={status}
            onChange={(s) => onMessage(`Review set to ${s} for ${formatClock(event.t)}.`)}
          />
        </div>
      )}

      {/* The label is for assistive technology: the placeholder and the line above already say what this box is. */}
      <label htmlFor="note-input" className="sr-only">
        Note
      </label>
      <Textarea
        id="note-input"
        ref={input}
        rows={2}
        value={text}
        aria-invalid={error}
        aria-describedby={error ? "note-error" : undefined}
        onChange={(e) => onText(e.target.value)}
        name="note"
        autoComplete="off"
        placeholder="Operator was on the radio; discuss alert priority…"
        className="mt-2"
      />
      {error && (
        <p id="note-error" className="mt-1 text-xs font-semibold">
          Write a note before saving.
        </p>
      )}

      {/* Pinned to the bottom of the panel, so Save is always reachable even when the composer is taller than the panel. */}
      <div className="sticky bottom-0 mt-2 flex flex-wrap items-center gap-3 bg-surface pt-1">
        <Button variant="primary" onClick={save}>
          <IconSave />
          Save note
        </Button>
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  );
}
