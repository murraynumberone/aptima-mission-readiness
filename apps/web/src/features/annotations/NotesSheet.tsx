import { useEffect, useMemo, useRef, useState } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { Button } from "@mission-readiness/ui";
import { IconExpand, IconExport } from "../../app/icons";
import type { Run } from "../../data/types";
import { useAnnotationActions, useDebrief } from "../../lib/annotations-react";
import { useClock, useClockActions } from "../../lib/clock-react";
import { buildDebriefMarkdown, summarizeReviews } from "../../lib/debrief";
import { NoteComposer } from "./NoteComposer";
import { NoteList } from "./NoteList";

interface Props {
  run: Run;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Changes whenever something asks for the note box to take focus (the toolbar's "Add note"). */
  focusRequest: number;
}

/**
 * Notes and debrief, docked at the bottom and collapsed to a slim bar until wanted. A region, not a dialog: it
 * never takes focus on its own or blocks the page, and Escape folds it.
 */
export function NotesSheet({ run, open, onOpenChange, focusRequest }: Props) {
  const store = useAnnotationActions();
  const clock = useClockActions();
  const edge = useClock((s) => Math.floor(s.edge));
  const reviews = useDebrief((s) => s.reviews);
  const count = useDebrief((s) => s.annotations.length);
  const summary = useMemo(() => summarizeReviews(run, edge, reviews), [run, edge, reviews]);
  const [message, setMessage] = useState("");
  const [exported, setExported] = useState("");
  const section = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  // Something asked for the note box (the toolbar button): once the sheet is open, put the cursor in it.
  const lastRequest = useRef(focusRequest);
  useEffect(() => {
    if (focusRequest === lastRequest.current) return;
    lastRequest.current = focusRequest;
    requestAnimationFrame(() => document.getElementById("note-input")?.focus());
  }, [focusRequest]);

  // Keeps keyboard focus from landing behind the sheet (WCAG 2.4.11). Not scroll padding: that also moved the page
  // on every keystroke inside the sheet.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const sheet = section.current;
      const target = e.target;
      if (!sheet || !(target instanceof HTMLElement) || sheet.contains(target)) return;
      if (getComputedStyle(sheet).position !== "sticky") return; // in the page, not over it
      const covered = sheet.getBoundingClientRect();
      const box = target.getBoundingClientRect();
      // Only ordinary controls. <main> is focusable (the skip link lands there) and far too tall to scroll clear.
      if (box.height > window.innerHeight * 0.4) return;
      const sideBySide = box.right <= covered.left || box.left >= covered.right;
      const behind = box.bottom - covered.top;
      if (!sideBySide && behind > 0 && box.top < covered.bottom)
        window.scrollBy({ top: behind + 8, behavior: "instant" });
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  const exportMarkdown = () => {
    const markdown = buildDebriefMarkdown(run, store.getState(), clock.getState().edge, new Date());
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    const name = `debrief-${run.number}.md`;
    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: name,
    });
    link.click();
    URL.revokeObjectURL(url);
    setExported(`Exported ${name}.`);
  };

  return (
    // Escape anywhere inside the sheet folds it; the region is not a control.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      ref={section}
      aria-label="Notes"
      className="notes-sheet mt-5"
      onKeyDown={(e) => {
        // Escape folds the sheet. An edit or delete confirmation handles its own Escape first and stops the event.
        if (e.key === "Escape" && open) {
          onOpenChange(false);
          requestAnimationFrame(() => trigger.current?.focus());
        }
      }}
    >
      <Collapsible.Root open={open} onOpenChange={onOpenChange}>
        <div className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5">
          <Collapsible.Trigger ref={trigger} className="btn group gap-2">
            <IconExpand className="transition-transform group-data-panel-open:rotate-180" />
            Notes <span className="tabular-nums">{count}</span>
          </Collapsible.Trigger>
          {/* The review summary and Export live in the bar, so they're there whether or not the sheet is open. */}
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-3 font-mono text-xs">
            <span className="font-medium tabular-nums">
              Reviewed {summary.reviewed} of {summary.total} events
            </span>
            <span className="whitespace-nowrap text-muted-foreground">{summary.counts.unreviewed} unreviewed</span>
          </p>
          <div className="ml-auto flex items-center gap-3">
            <p role="status" className="text-xs text-muted-foreground">
              {exported}
            </p>
            <Button onClick={exportMarkdown}>
              <IconExport />
              Export Markdown
            </Button>
          </div>
        </div>
        {/* keepMounted keeps a half-written note when folded. The height is fixed, so typing and editing never resize the sheet. */}
        <Collapsible.Panel keepMounted data-testid="notes-panel" className="notes-panel border-t border-line">
          <div className="grid h-[min(15rem,37vh)] gap-4 overflow-y-auto overscroll-contain p-3 md:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
            <NoteComposer run={run} message={message} onMessage={setMessage} />
            <NoteList run={run} onMessage={setMessage} />
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </section>
  );
}
