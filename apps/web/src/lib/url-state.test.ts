import { describe, expect, it } from "vitest";
import { currentRun } from "../data/runs";
import { readUrlState, writeUrlState } from "./url-state";

describe("readUrlState", () => {
  // Protects against: a shared link opening at the wrong moment, or beyond the part of the exercise that has happened
  it("reads a moment and an operator, and never goes past what the exercise has reached", () => {
    expect(readUrlState(currentRun, "?t=540&op=op-03")).toEqual({ time: 540, operatorId: "op-03" });
    expect(readUrlState(currentRun, "?t=99999").time).toBe(currentRun.initialEdgeSec);
    expect(readUrlState(currentRun, "?t=0").time).toBe(0);
  });

  // Protects against: a hand-edited, truncated or hostile link crashing the app or opening somewhere nonsensical
  it("ignores anything malformed instead of failing", () => {
    for (const bad of [
      "?t=abc",
      "?t=-5",
      "?t=1.5",
      "?t=",
      "?t=1e3",
      "?t=540abc",
      "?op=nobody",
      "?op=",
      "?t=%00",
      "?",
    ]) {
      const state = readUrlState(currentRun, bad);
      expect(state.time === null || Number.isInteger(state.time), bad).toBe(true);
      expect(state.operatorId, bad).toBeNull();
    }
    expect(readUrlState(currentRun, "?t=abc&op=op-02")).toEqual({ time: null, operatorId: "op-02" }); // one bad part doesn't spoil the other
  });
});

describe("writeUrlState", () => {
  // Protects against: a copied link missing the moment or operator, or clobbering other parts of the address
  it("puts the moment and operator in the address, removes the operator when closed, and keeps everything else", () => {
    window.history.replaceState(null, "", "/?keep=1#section");
    writeUrlState({ time: 540.9, operatorId: "op-03" });
    expect(window.location.search).toBe("?keep=1&t=540&op=op-03");
    expect(window.location.hash).toBe("#section");
    writeUrlState({ operatorId: null });
    expect(window.location.search).toBe("?keep=1&t=540");
  });

  // Protects against: scrubbing filling the Back button with hundreds of entries
  it("replaces the history entry instead of adding one", () => {
    const before = window.history.length;
    writeUrlState({ time: 10 });
    writeUrlState({ time: 20 });
    writeUrlState({ time: 30 });
    expect(window.history.length).toBe(before);
  });
});
