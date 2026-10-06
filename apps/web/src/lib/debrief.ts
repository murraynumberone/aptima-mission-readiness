import type { Run } from "../data/types";
import { REVIEW_STATUSES, reviewLabels, type DebriefState, type Review, type ReviewStatus } from "./annotations";
import { formatClock } from "./format";

export interface ReviewSummary {
  total: number;
  reviewed: number;
  counts: Record<ReviewStatus, number>;
}

/** How many of the events that have happened so far have been reviewed. Future events don't count. */
export function summarizeReviews(run: Run, edge: number, reviews: Record<string, Review>): ReviewSummary {
  const counts = Object.fromEntries(REVIEW_STATUSES.map((s) => [s, 0])) as Record<ReviewStatus, number>;
  const happened = run.events.filter((e) => e.t <= edge);
  for (const e of happened) counts[reviews[e.id]?.status ?? "unreviewed"]++;
  return {
    total: happened.length,
    reviewed: happened.length - counts.unreviewed,
    counts,
  };
}

const quote = (text: string) =>
  text
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");

/** The debrief as Markdown. Notes are quoted so their text can never become headings. */
export function buildDebriefMarkdown(run: Run, state: DebriefState, edge: number, exportedAt: Date): string {
  const summary = summarizeReviews(run, edge, state.reviews);
  const status =
    edge >= run.durationSec
      ? `Complete, ${formatClock(run.durationSec)}`
      : `In Progress, ${formatClock(edge)} of ${formatClock(run.durationSec)}`;
  const counts = REVIEW_STATUSES.map((s) => `${reviewLabels[s]} ${summary.counts[s]}`).join(", ");

  const lines = [
    `# Debrief: Exercise ${run.number}, ${run.name}`,
    "",
    `Team ${run.team.name} · ${status} · Exported ${exportedAt.toISOString().slice(0, 10)}`,
    "",
    "## Review summary",
    "",
    `Reviewed ${summary.reviewed} of ${summary.total} events. ${counts}.`,
    "",
    "## Events",
    "",
    ...run.events
      .filter((e) => e.t <= edge)
      .map((e) => `- ${formatClock(e.t)} ${e.title}: ${reviewLabels[state.reviews[e.id]?.status ?? "unreviewed"]}`),
    "",
    "## Notes",
    "",
  ];

  const notes = [...state.annotations].sort((a, b) => a.t - b.t || a.createdAt.localeCompare(b.createdAt));
  if (notes.length === 0) lines.push("No notes yet.", "");
  for (const n of notes) {
    const event = run.events.find((e) => e.id === n.eventId);
    const review = event && state.reviews[event.id] ? ` (${reviewLabels[state.reviews[event.id]!.status]})` : "";
    lines.push(`### ${formatClock(n.t)} · ${event ? event.title : "Moment note"}${review}`, "", quote(n.text), "");
  }

  lines.push("---", "", "Concept project by Derick Murray. All data is fictional.", "");
  return lines.join("\n");
}
