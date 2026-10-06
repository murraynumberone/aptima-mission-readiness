import { useMemo } from "react";
import { ReviewBadge } from "@mission-readiness/ui";
import type { Run } from "../../data/types";
import { reviewLabels } from "../../lib/annotations";
import { useDebrief } from "../../lib/annotations-react";
import { useClock, useClockActions } from "../../lib/clock-react";
import { formatClock, formatIsoDuration } from "../../lib/format";
import { latestEventAt } from "../../lib/metrics";
import { EventIcon } from "./EventIcon";

/** Keyboard- and screen-reader-friendly route to every marker on the timeline. */
export function EventList({ run }: { run: Run }) {
  const clock = useClockActions();
  const edge = useClock((s) => Math.floor(s.edge));
  const currentId = useClock((s) => latestEventAt(run, s.time)?.id);
  const events = run.events.filter((e) => e.t <= edge);
  const reviews = useDebrief((s) => s.reviews);
  const annotations = useDebrief((s) => s.annotations);
  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of annotations) if (a.eventId) counts[a.eventId] = (counts[a.eventId] ?? 0) + 1;
    return counts;
  }, [annotations]);

  return (
    <section aria-labelledby="events-heading" className="mt-5">
      <h2 id="events-heading" className="label mb-2">
        Events
      </h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events yet.</p>
      ) : (
        <ol className="panel overflow-hidden">
          {events.map((e) => (
            // The whole row is the hover, selected and focus target; one grid keeps icon, time,
            // title and detail on shared columns.
            <li
              key={e.id}
              className="group/row relative border-b border-line last:border-b-0 hover:bg-bg has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-focus-ring has-[[aria-current=true]]:bg-fill-subtle"
            >
              <div className="grid grid-cols-[0.875rem_3rem_minmax(0,1fr)] items-baseline gap-x-3 gap-y-0.5 px-4 py-3 sm:grid-cols-[0.875rem_3rem_minmax(0,1fr)_auto]">
                <EventIcon kind={e.kind} size={14} className="translate-y-0.5 self-start text-muted-foreground" />
                <button
                  type="button"
                  aria-describedby={`${e.id}-why`}
                  aria-current={e.id === currentId ? "true" : undefined}
                  onClick={() => clock.seek(e.t)}
                  // Stretched over the whole row so the entire row is clickable.
                  className="group col-span-2 col-start-2 grid grid-cols-subgrid items-baseline text-left outline-none after:absolute after:inset-0"
                >
                  <time
                    className="font-mono text-xs text-muted-foreground tabular-nums group-has-[[aria-current=true]]/row:text-surface-foreground"
                    dateTime={formatIsoDuration(e.t)}
                  >
                    {formatClock(e.t)}
                  </time>
                  <span className="font-medium group-aria-[current=true]:font-bold">{e.title}</span>
                </button>
                <p
                  id={`${e.id}-why`}
                  className="col-start-3 text-xs text-muted-foreground group-has-[[aria-current=true]]/row:text-surface-foreground"
                >
                  {e.detail}
                </p>
                <span className="col-start-3 mt-1 flex items-center gap-2 font-mono text-xs text-muted-foreground group-has-[[aria-current=true]]/row:text-surface-foreground sm:col-start-4 sm:row-start-1 sm:mt-0 sm:justify-self-end">
                  <ReviewBadge status={reviews[e.id]?.status ?? "unreviewed"}>
                    {reviewLabels[reviews[e.id]?.status ?? "unreviewed"]}
                  </ReviewBadge>
                  {noteCounts[e.id] ? (
                    <span>
                      · {noteCounts[e.id]} {noteCounts[e.id] === 1 ? "note" : "notes"}
                    </span>
                  ) : null}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
