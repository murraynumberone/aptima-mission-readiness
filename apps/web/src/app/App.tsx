import { useEffect, useRef, useState } from "react";
import { currentRun } from "../data/runs";
import type { Run } from "../data/types";
import { NotesSheet } from "../features/annotations/NotesSheet";
import { OperatorPanel } from "../features/operators/OperatorPanel";
import { AttentionBar } from "../features/overview/AttentionBar";
import { ExerciseHeader } from "../features/overview/ExerciseHeader";
import { MetricReadout } from "../features/overview/MetricReadout";
import { OperatorTable } from "../features/overview/OperatorTable";
import { PerformanceChart } from "../features/overview/PerformanceChart";
import { EventList } from "../features/timeline/EventList";
import { LiveSummary } from "../features/timeline/LiveSummary";
import { PlaybackControls } from "../features/timeline/PlaybackControls";
import { createAnnotations, type AnnotationStore } from "../lib/annotations";
import { AnnotationsProvider } from "../lib/annotations-react";
import { createClock, type Clock } from "../lib/clock";
import { ClockProvider } from "../lib/clock-react";
import { readUrlState, writeUrlState } from "../lib/url-state";
import { AppBar } from "./AppBar";
import { DisplayMenu } from "./DisplayMenu";
import { ThemeSwitcher } from "./ThemeSwitcher";

const NOTES_OPEN_KEY = "mr-notes-open";
function readNotesOpen() {
  try {
    return localStorage.getItem(NOTES_OPEN_KEY) === "true";
  } catch {
    return false;
  }
}
function writeNotesOpen(open: boolean) {
  try {
    localStorage.setItem(NOTES_OPEN_KEY, String(open));
  } catch {
    /* it just won't be remembered */
  }
}

/** A shared link opens paused at its moment, so what was shared stays put. Otherwise it plays on from the live edge. */
const newClock = (run: Run, sharedTime: number | null) =>
  createClock({
    duration: run.durationSec,
    edge: run.initialEdgeSec,
    time: sharedTime ?? run.initialEdgeSec,
    playing: sharedTime === null,
  });

interface AppProps {
  run?: Run;
  clock?: Clock;
  annotations?: AnnotationStore;
  drive?: boolean;
}

export function App({ run = currentRun, clock: injected, annotations: injectedNotes, drive = true }: AppProps) {
  // An injected clock means a test is driving: leave the address out of it.
  const [shared] = useState(() => (injected ? { time: null, operatorId: null } : readUrlState(run)));
  const [clock] = useState(() => injected ?? newClock(run, shared.time));
  const [notes] = useState(() => injectedNotes ?? createAnnotations(run.id));
  const [selectedId, setSelectedId] = useState<string | null>(shared.operatorId);
  const opener = useRef<string | null>(null);

  // The notes sheet is folded away until wanted, and remembers how it was left.
  const [notesOpen, setNotesOpen] = useState(readNotesOpen);
  const [focusRequest, setFocusRequest] = useState(0);
  const changeNotesOpen = (open: boolean) => {
    setNotesOpen(open);
    writeNotesOpen(open);
  };
  const addNote = () => {
    changeNotesOpen(true);
    setFocusRequest((n) => n + 1);
  };

  // The address follows what the person does (not every playback tick), so any moment can be linked to.
  useEffect(() => {
    let lastSeeks = clock.getState().seeks;
    const unsubscribe = clock.subscribe(() => {
      const state = clock.getState();
      if (state.seeks === lastSeeks) return;
      lastSeeks = state.seeks;
      writeUrlState({ time: state.time });
    });
    return () => {
      unsubscribe();
    };
  }, [clock]);
  useEffect(() => {
    writeUrlState({ operatorId: selectedId });
  }, [selectedId]);

  const select = (id: string, returnFocusTo: string) => {
    opener.current = returnFocusTo;
    setSelectedId(id);
    // When the panel is stacked below the table, bring it into view.
    document.getElementById("operator-panel")?.scrollIntoView?.({ block: "nearest" });
  };
  // Closing returns focus to the row button that opened the panel.
  const close = () => {
    setSelectedId(null);
    const target = opener.current;
    if (target) requestAnimationFrame(() => document.getElementById(target)?.focus());
  };
  return (
    <ClockProvider clock={clock} drive={drive}>
      <AnnotationsProvider store={notes}>
        {/* First tab stop. Off-screen until focused, so it stays in the accessibility tree. */}
        <a href="#main" className="btn btn-primary fixed top-3 left-4 z-50 -translate-y-20 focus:translate-y-0">
          Skip to main content
        </a>
        <header>
          <AppBar
            actions={
              <>
                <ThemeSwitcher />
                <DisplayMenu />
              </>
            }
          />
          <div className="mx-auto max-w-352 px-4 pt-4">
            <ExerciseHeader run={run} />
          </div>
        </header>
        <div className="mx-auto max-w-352 px-4 pb-4">
          {/* tabIndex -1 so the skip link can move focus here. outline-none is deliberate: <main> is a landmark, not a control. */}
          <main
            id="main"
            tabIndex={-1}
            className="outline-none xl:grid xl:grid-cols-[minmax(0,1fr)_23rem] xl:gap-x-5 xl:*:data-aside:col-start-2 xl:*:data-aside:row-span-5 xl:*:data-aside:row-start-1 xl:[&>*:not([data-aside])]:col-start-1"
          >
            <PlaybackControls run={run} onAddNote={addNote} />
            <AttentionBar run={run} onSelect={select} />
            <MetricReadout run={run} />
            <OperatorTable run={run} selectedId={selectedId} onSelect={select} />
            <PerformanceChart run={run} />
            <OperatorPanel run={run} operatorId={selectedId} onClose={close} />
            <EventList run={run} />
            <NotesSheet run={run} open={notesOpen} onOpenChange={changeNotesOpen} focusRequest={focusRequest} />
            <LiveSummary run={run} />
          </main>
          <footer className="mt-6 border-t border-line pt-3 text-xs text-muted-foreground">
            Concept project by Derick Murray. Not affiliated with, endorsed by, or built for Aptima, Inc. All data is
            fictional.
          </footer>
        </div>
      </AnnotationsProvider>
    </ClockProvider>
  );
}
