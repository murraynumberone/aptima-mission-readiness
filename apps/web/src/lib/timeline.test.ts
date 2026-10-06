import { describe, expect, it } from "vitest";
import { currentRun } from "../data/runs";
import { nextEvent, previousEvent, snapToEvent, summarizeMoment } from "./timeline";

const EDGE = 1080;

describe("snapToEvent", () => {
  // Protects against: dragging near an event not snapping to it
  it("snaps to a marker within the threshold", () => {
    expect(snapToEvent(currentRun, 548, EDGE)?.id).toBe("b-03"); // marker at 540
  });
  // Protects against: the scrubber snapping from far away, so you can't land between events
  it("leaves the value alone outside the threshold", () => {
    expect(snapToEvent(currentRun, 600, EDGE)).toBeUndefined();
  });
  // Protects against: a drag snapping into the future
  it("never snaps to an event that hasn't happened yet", () => {
    expect(snapToEvent(currentRun, 1195, EDGE)).toBeUndefined(); // b-07 at 1200 is past the edge
  });
});

describe("event navigation", () => {
  // Protects against: Next event repeating the current event, or running past the live edge
  it("finds the next event strictly after now, within the edge", () => {
    expect(nextEvent(currentRun, 0, EDGE)?.id).toBe("b-01");
    expect(nextEvent(currentRun, 180, EDGE)?.id).toBe("b-02");
    expect(nextEvent(currentRun, 990, EDGE)).toBeUndefined();
  });
  // Protects against: Previous event getting stuck on the current event
  it("finds the previous event strictly before now", () => {
    expect(previousEvent(currentRun, 180)).toBeUndefined();
    expect(previousEvent(currentRun, 181)?.id).toBe("b-01");
    expect(previousEvent(currentRun, 540)?.id).toBe("b-02");
  });
});

describe("spoken text", () => {
  // Protects against: the live-region summary missing who needs attention
  it("summarizes time, alerts and who needs attention", () => {
    expect(summarizeMoment(currentRun, 1080)).toBe("18 minutes elapsed. 3 alerts. Operator 03 needs attention.");
  });
});
