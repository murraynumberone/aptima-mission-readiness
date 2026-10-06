import { useEffect, useMemo, useRef, useState } from "react";
import { Button, ReviewBadge, Textarea } from "@mission-readiness/ui";
import { IconDelete, IconEdit, IconSave } from "../../app/icons";
import type { Annotation, Run } from "../../data/types";
import { reviewLabels } from "../../lib/annotations";
import { useAnnotationActions, useDebrief } from "../../lib/annotations-react";
import { useClockActions } from "../../lib/clock-react";
import { formatClock, formatIsoDuration } from "../../lib/format";
import { useUnsavedWarning } from "../../lib/use-unsaved-warning";

interface Props {
  run: Run;
  onMessage: (message: string) => void;
}

export function NoteList({ run, onMessage }: Props) {
  const annotations = useDebrief((s) => s.annotations);
  const notes = useMemo(
    () => [...annotations].sort((a, b) => a.t - b.t || a.createdAt.localeCompare(b.createdAt)),
    [annotations],
  );

  if (notes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No notes yet. Move the timeline to a moment, or pick an event, and write what to discuss.
      </p>
    );
  }
  return (
    <ol className="panel self-start">
      {notes.map((n) => (
        <NoteItem key={n.id} run={run} note={n} onMessage={onMessage} />
      ))}
    </ol>
  );
}

function NoteItem({ run, note, onMessage }: { run: Run; note: Annotation } & Pick<Props, "onMessage">) {
  const store = useAnnotationActions();
  const clock = useClockActions();
  const event = run.events.find((e) => e.id === note.eventId);
  const status = useDebrief((s) => (event ? (s.reviews[event.id]?.status ?? "unreviewed") : undefined));

  const [mode, setMode] = useState<"view" | "edit" | "confirm">("view");
  const [draft, setDraft] = useState(note.text);
  const editField = useRef<HTMLTextAreaElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const cancelDelete = useRef<HTMLButtonElement>(null);
  const previous = useRef(mode);
  useUnsavedWarning(mode === "edit" && draft !== note.text);

  // Move focus with each mode change so keyboard and screen reader users never lose their place.
  useEffect(() => {
    if (mode === "edit") editField.current?.focus();
    if (mode === "confirm") cancelDelete.current?.focus();
    if (mode === "view" && previous.current !== "view") editButton.current?.focus();
    previous.current = mode;
  }, [mode]);

  const saveEdit = () => {
    if (!draft.trim()) return;
    store.update(note.id, draft);
    setMode("view");
    onMessage(`Note at ${formatClock(note.t)} updated.`);
  };

  const confirmDelete = () => {
    store.remove(note.id);
    onMessage(`Note at ${formatClock(note.t)} deleted.`);
    document.getElementById("note-input")?.focus(); // this item is gone; land somewhere useful
  };

  return (
    // Escape from the edit box or delete prompt inside this row; the row is not a control.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <li
      className="border-b border-line px-4 py-3 last:border-b-0"
      onKeyDown={(e) => {
        if (e.key === "Escape" && mode !== "view") {
          e.stopPropagation();
          setDraft(note.text);
          setMode("view");
        }
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <button
          type="button"
          aria-label={`Go to ${formatClock(note.t)} on the timeline`}
          onClick={() => clock.seek(note.t)}
          className="flex min-h-6 items-baseline gap-2.5 text-left hover:underline"
        >
          <time className="font-mono text-xs font-medium tabular-nums" dateTime={formatIsoDuration(note.t)}>
            {formatClock(note.t)}
          </time>
          <span className="font-medium">{event ? event.title : "Moment note"}</span>
        </button>
        {status && (
          <ReviewBadge status={status} className="text-muted-foreground">
            {reviewLabels[status]}
          </ReviewBadge>
        )}
      </div>

      {mode === "edit" ? (
        <div className="mt-2">
          <label htmlFor={`edit-${note.id}`} className="sr-only">
            Edit note at {formatClock(note.t)}
          </label>
          <Textarea
            id={`edit-${note.id}`}
            name="note-edit"
            autoComplete="off"
            ref={editField}
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <Button variant="primary" onClick={saveEdit}>
              <IconSave />
              Save changes
            </Button>
            <Button
              onClick={() => {
                setDraft(note.text);
                setMode("view");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-1 wrap-anywhere whitespace-pre-wrap">{note.text}</p>
      )}

      {mode === "view" && (
        <div className="mt-2 flex gap-2">
          <Button ref={editButton} onClick={() => setMode("edit")}>
            <IconEdit />
            Edit <span className="sr-only">note at {formatClock(note.t)}</span>
          </Button>
          <Button onClick={() => setMode("confirm")}>
            <IconDelete />
            Delete <span className="sr-only">note at {formatClock(note.t)}</span>
          </Button>
        </div>
      )}

      {mode === "confirm" && (
        <div
          role="group"
          aria-label={`Delete note at ${formatClock(note.t)}`}
          className="mt-2 flex flex-wrap items-center gap-2"
        >
          <p className="text-sm font-medium">Delete this note?</p>
          <Button variant="primary" onClick={confirmDelete}>
            Yes, delete
          </Button>
          <Button ref={cancelDelete} onClick={() => setMode("view")}>
            Cancel
          </Button>
        </div>
      )}
    </li>
  );
}
