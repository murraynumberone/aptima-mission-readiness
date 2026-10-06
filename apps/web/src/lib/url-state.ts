import type { Run } from "../data/types";

export interface UrlState {
  /** A shared moment, in whole seconds, never beyond what the exercise has reached. */
  time: number | null;
  /** A shared operator whose detail is open. */
  operatorId: string | null;
}

/** Reads a shared moment and operator from the address. Anything missing or malformed is ignored, never an error. */
export function readUrlState(run: Run, search = window.location.search): UrlState {
  const params = new URLSearchParams(search);
  const rawTime = params.get("t");
  const time = rawTime !== null && /^\d{1,6}$/.test(rawTime) ? Math.min(Number(rawTime), run.initialEdgeSec) : null;
  const op = params.get("op");
  const operatorId = op !== null && run.team.operators.some((o) => o.id === op) ? op : null;
  return { time, operatorId };
}

/**
 * Writes the moment and/or open operator to the address, replacing the history entry so scrubbing does not
 * fill Back. Other parts of the address are kept.
 */
export function writeUrlState(update: { time?: number; operatorId?: string | null }): string {
  const url = new URL(window.location.href);
  if (update.time !== undefined) url.searchParams.set("t", String(Math.max(0, Math.floor(update.time))));
  if (update.operatorId !== undefined) {
    if (update.operatorId) url.searchParams.set("op", update.operatorId);
    else url.searchParams.delete("op");
  }
  window.history.replaceState(window.history.state, "", url);
  return url.toString();
}
