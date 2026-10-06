import { describe, expect, it } from "vitest";
import { createClock } from "./clock";

const make = (o = {}) => createClock({ duration: 100, edge: 40, ...o });

describe("clock", () => {
  // Protects against: the exercise advancing while paused
  it("does nothing on tick while paused", () => {
    const c = make();
    c.tick(5);
    expect(c.getState()).toMatchObject({ time: 40, edge: 40 });
  });

  // Protects against: playback and the live edge falling out of step
  it("advances time and the live edge together while playing", () => {
    const c = make({ playing: true });
    c.tick(5);
    expect(c.getState()).toMatchObject({ time: 45, edge: 45 });
  });

  // Protects against: scrubbing into time that hasn't happened
  it("never lets the cursor pass the edge", () => {
    const c = make();
    c.seek(999);
    expect(c.getState().time).toBe(40);
    c.seek(-5);
    expect(c.getState().time).toBe(0);
  });

  // Protects against: a scrubbed-back view being dragged to the live edge by playback
  it("keeps a scrubbed-back cursor behind the edge as both advance", () => {
    const c = make({ playing: true });
    c.seek(10);
    c.tick(5);
    expect(c.getState()).toMatchObject({ time: 15, edge: 45 });
  });

  // Protects against: playback running past the end
  it("stops at the end of the exercise", () => {
    const c = make({ playing: true });
    c.tick(500);
    expect(c.getState()).toMatchObject({ time: 100, edge: 100, playing: false });
  });
});

describe("clock seekedTo", () => {
  // Protects against: the reported bug: a jump's target being lost as the running clock ticks on
  it("remembers where a user move was aimed, even after playback ticks on", () => {
    const c = createClock({ duration: 100, edge: 40, playing: true });
    c.seek(25);
    c.tick(3);
    expect(c.getState().time).toBe(28);
    expect(c.getState().seekedTo).toBe(25);
    c.goLive();
    expect(c.getState().seekedTo).toBe(c.getState().edge);
  });
});
