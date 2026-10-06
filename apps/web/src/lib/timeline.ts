import type { ExerciseEvent, Run } from "../data/types";
import { formatSpoken } from "./format";
import { alertCountAt, momentAt } from "./metrics";

/** How close a pointer drag must get to a marker before it snaps to it, in seconds. */
const SNAP_SEC = 15;

/** The event within `threshold` of `t` (nearest wins), among events that have already happened. */
export function snapToEvent(run: Run, t: number, edge: number, threshold = SNAP_SEC) {
  let best: ExerciseEvent | undefined;
  for (const e of run.events) {
    if (e.t > edge || Math.abs(e.t - t) > threshold) continue;
    if (!best || Math.abs(e.t - t) < Math.abs(best.t - t)) best = e;
  }
  return best;
}

export const eventAt = (run: Run, t: number) => run.events.find((e) => e.t === Math.floor(t));

export const previousEvent = (run: Run, t: number) => run.events.findLast((e) => e.t < Math.floor(t));

export const nextEvent = (run: Run, t: number, edge: number) =>
  run.events.find((e) => e.t > Math.floor(t) && e.t <= edge);

const operatorName = (run: Run, e: ExerciseEvent) => run.team.operators.find((o) => o.id === e.operatorId)?.name;

/** Slider aria-valuetext: human time, plus the event if the thumb is on one. */
export function describeValue(run: Run, t: number) {
  const base = `${formatSpoken(t)} elapsed`;
  const e = eventAt(run, t);
  if (!e) return base;
  const who = operatorName(run, e);
  return `${base}. Event: ${e.title}${who ? `, ${who}` : ""}.`;
}

/** One calm sentence for the polite live region, spoken after scrubbing settles. */
export function summarizeMoment(run: Run, t: number) {
  const parts = [describeValue(run, t).replace(/\.$/, "")];
  const alerts = alertCountAt(run, t);
  parts.push(`${alerts} ${alerts === 1 ? "alert" : "alerts"}`);
  const flagged = momentAt(run, t).operators.filter((o) => o.status !== "nominal");
  if (flagged.length) parts.push(`${flagged.map((o) => o.name).join(" and ")} needs attention`);
  return parts.join(". ") + ".";
}
