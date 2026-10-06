import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createClock } from "./clock";
import { ClockProvider } from "./clock-react";

afterEach(() => vi.unstubAllGlobals());

/** Run `requestAnimationFrame` callbacks by hand at chosen timestamps. */
function fakeFrames(startAt: number) {
  let queue: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => queue.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => (queue = []));
  vi.spyOn(performance, "now").mockReturnValue(startAt);
  return (now: number) => {
    const run = queue;
    queue = [];
    run.forEach((cb) => cb(now));
  };
}

describe("ClockProvider driver", () => {
  // Protects against: playback running at the wrong speed
  it("ticks the clock by real elapsed time", () => {
    const frame = fakeFrames(0);
    const clock = createClock({ duration: 100, edge: 10, playing: true });
    render(
      <ClockProvider clock={clock}>
        <div />
      </ClockProvider>,
    );
    frame(100);
    frame(200);
    expect(clock.getState().time).toBeCloseTo(10.2, 5);
  });

  // Protects against: the clock jumping far ahead after a background tab was throttled
  it("caps a long gap, such as a throttled background tab", () => {
    const frame = fakeFrames(0);
    const clock = createClock({ duration: 100, edge: 10, playing: true });
    render(
      <ClockProvider clock={clock}>
        <div />
      </ClockProvider>,
    );
    frame(60_000);
    expect(clock.getState().time).toBe(10.25);
  });
});
