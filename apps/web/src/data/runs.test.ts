import { describe, expect, it } from "vitest";
import { generateRun } from "./generate";
import { currentRun, currentSpec, priorRun } from "./runs";

describe("synthetic runs", () => {
  // Protects against: random data sneaking in, so the demo differs between loads
  it("is deterministic: same spec, same data", () => {
    expect(generateRun(currentSpec)).toEqual(currentRun);
  });

  // Protects against: an event off the sample grid, so jumping to it shows data from just before it
  it.each([currentRun, priorRun])("$number events are sorted, in range, and aligned to samples", (run) => {
    const times = run.events.map((e) => e.t);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    for (const t of times) {
      expect(t).toBeGreaterThan(0);
      expect(t).toBeLessThanOrEqual(run.durationSec);
      expect(t % run.sampleIntervalSec).toBe(0);
    }
  });
});
