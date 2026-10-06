import { describe, expect, it } from "vitest";
import { currentRun } from "../data/runs";
import { createAnnotations } from "./annotations";
import { buildDebriefMarkdown, summarizeReviews } from "./debrief";

const EDGE = 1080;
const EXPORTED = new Date("2026-10-04T09:30:00Z");

describe("summarizeReviews", () => {
  // Protects against: a wrong progress count in the debrief
  it("counts statuses and how many are reviewed", () => {
    const reviews = {
      "b-03": { status: "confirmed" as const, updatedAt: "x" },
      "b-04": { status: "adjusted" as const, updatedAt: "x" },
      "b-06": { status: "dismissed" as const, updatedAt: "x" },
    };
    const s = summarizeReviews(currentRun, EDGE, reviews);
    expect(s.reviewed).toBe(3);
    expect(s.counts).toEqual({
      unreviewed: 3,
      confirmed: 1,
      adjusted: 1,
      dismissed: 1,
    });
  });

  // Protects against: future events inflating the review count
  it("leaves out events that haven't happened yet, even if they carry a review", () => {
    const s = summarizeReviews(currentRun, EDGE, {
      "b-07": { status: "confirmed", updatedAt: "x" },
    }); // b-07 is at 20:00
    expect(s.total).toBe(6);
    expect(s.counts.confirmed).toBe(0);
  });
});

describe("buildDebriefMarkdown", () => {
  const store = createAnnotations(currentRun.id, {
    storage: null,
    now: () => EXPORTED,
  });
  store.add({ t: 540, text: "Missed it while on the radio.", eventId: "b-03" });
  store.add({ t: 600, text: "Line one\n# not a heading" });
  store.setReview("b-03", "confirmed");
  const md = buildDebriefMarkdown(currentRun, store.getState(), EDGE, EXPORTED);

  // Protects against: an export that doesn't say what it is about
  it("starts with the exercise, team, status and date", () => {
    expect(md).toContain("# Debrief: Exercise 24-B, Coastal Response Simulation");
    expect(md).toContain("Team Alpha 3 · In Progress, 18:00 of 30:00 · Exported 2026-10-04");
  });

  // Protects against: an export that omits reviews or includes events that haven't happened
  it("summarizes reviews and lists every event so far with its status", () => {
    expect(md).toContain("Reviewed 1 of 6 events. Unreviewed 5, Confirmed 1, Adjusted 0, Dismissed 0.");
    expect(md).toContain("- 9:00 Missed alert: channel congestion: Confirmed");
    expect(md).toContain("- 3:00 Initial report received: Unreviewed");
    expect(md).not.toContain("relay status"); // 25:00, hasn't happened
  });

  // Protects against: notes out of order, or detached from their event and review
  it("puts notes in time order under a heading with the event and its review", () => {
    expect(md.indexOf("### 9:00 · Missed alert: channel congestion (Confirmed)")).toBeGreaterThan(-1);
    expect(md.indexOf("### 9:00")).toBeLessThan(md.indexOf("### 10:00 · Moment note"));
    expect(md).toContain("> Missed it while on the radio.");
  });

  // Protects against: a note's text turning into headings and corrupting the document
  it("quotes note text so it can't inject headings", () => {
    expect(md).toContain("> Line one\n> # not a heading");
    expect(md).not.toMatch(/^# not a heading/m);
  });

  // Protects against: an empty export, or a finished run described as in progress
  it("says so when there are no notes, and says Complete for a finished run", () => {
    const blank = createAnnotations("x", { storage: null });
    const text = buildDebriefMarkdown(currentRun, blank.getState(), currentRun.durationSec, EXPORTED);
    expect(text).toContain("No notes yet.");
    expect(text).toContain("Team Alpha 3 · Complete, 30:00 · Exported");
  });

  // Protects against: the exported file leaving the disclaimer behind
  it("ends with the non-affiliation note", () => {
    expect(md).toContain("All data is fictional.");
  });
});
