import { describe, expect, it } from "vitest";
import { currentRun } from "../data/runs";
import { explainOperator } from "./explain";
import { momentAt } from "./metrics";

const EDGE = 1080;

describe("explainOperator", () => {
  // Protects against: a flag with no explanation, or one that names the wrong weakest area
  it("explains an Attention operator: where they stand, the line they're under, the weakest area", () => {
    const e = explainOperator(currentRun, "op-03", EDGE);
    expect(e.status).toBe("attention");
    expect(e.summary).toMatch(/^Operator 03 is at \d+%, below the 72% attention line\. Lowest area: .+ \(\d+%\)\.$/);
    expect(e.areas.filter((a) => a.lowest)).toHaveLength(1);
    expect(e.areas.find((a) => a.lowest)!.label).toBe(e.summary.match(/Lowest area: (.+) \(/)![1]);
  });

  // Protects against: a critical operator described with the attention threshold
  it("uses the critical line when the score is below 60", () => {
    const e = explainOperator(currentRun, "op-03", 750); // just after the unactioned autonomy flag
    expect(e.status).toBe("critical");
    expect(e.summary).toContain("below the 60% critical line");
  });

  // Protects against: the Why showing another operator's events, in the wrong order
  it("lists only this operator's events up to now, newest first", () => {
    const ids = explainOperator(currentRun, "op-03", EDGE).causes.map((c) => c.event.id);
    expect(ids).toEqual(["b-06", "b-04", "b-03"]);
    expect(explainOperator(currentRun, "op-03", 600).causes.map((c) => c.event.id)).toEqual(["b-03"]);
  });

  // Protects against: leaking a future event into the explanation
  it("never reveals events that haven't happened yet", () => {
    expect(explainOperator(currentRun, "op-04", EDGE).causes).toEqual([]); // b-07 is at 20:00
    expect(explainOperator(currentRun, "op-04", 1200).causes.map((c) => c.event.id)).toEqual(["b-07"]);
  });

  // Protects against: the panel stating score changes that didn't happen
  it("reports the real before and after scores around an event", () => {
    const c = explainOperator(currentRun, "op-03", EDGE).causes.find((x) => x.event.id === "b-04")!;
    const op = (t: number) => momentAt(currentRun, t).operators.find((o) => o.id === "op-03")!.score;
    expect(c.before).toBeCloseTo(op(730), 5);
    expect(c.after).toBeCloseTo(op(740), 5);
    expect(c.outcome).toBe("fell");
    expect(c.after).toBeLessThan(c.before - 10);
  });

  // Protects against: blaming the wrong skill area
  it("names the skill area an event hit hardest", () => {
    const causes = explainOperator(currentRun, "op-03", EDGE).causes;
    expect(causes.find((c) => c.event.id === "b-04")!.area).toBe("Situational awareness"); // -55 vs -40
    expect(causes.find((c) => c.event.id === "b-03")!.area).toBe("Response time"); // -45 vs -30
  });
});
