const pad = (n: number) => String(n).padStart(2, "0");

/** "12:40" */
export function formatClock(sec: number) {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** "12 minutes 40 seconds", for screen readers and tooltips. */
export function formatSpoken(sec: number) {
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  return [m && part(m, "minute"), (r || !m) && part(r, "second")].filter(Boolean).join(" ");
}

/** ISO 8601 duration for <time dateTime>, e.g. "PT12M40S". */
export function formatIsoDuration(sec: number) {
  const s = Math.floor(sec);
  return `PT${Math.floor(s / 60)}M${s % 60}S`;
}

export const formatScore = (n: number) => Math.round(n).toString();
