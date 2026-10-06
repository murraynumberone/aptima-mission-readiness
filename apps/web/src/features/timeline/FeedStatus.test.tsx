import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createClock } from "../../lib/clock";
import { ClockProvider } from "../../lib/clock-react";
import { FeedStatus } from "./FeedStatus";

function setup(options: { time?: number; edge?: number; duration?: number; playing?: boolean }) {
  const { edge = 1080, duration = 1800, time = edge, playing = false } = options;
  const clock = createClock({ duration, edge, time, playing });
  render(
    <ClockProvider clock={clock} drive={false}>
      <FeedStatus />
    </ClockProvider>,
  );
  return clock;
}
const text = () => screen.getByTestId("feed-status").textContent;

describe("feed status", () => {
  // Protects against: not knowing whether the numbers on screen are the newest the exercise has produced
  it("says Live while playing at the newest moment, and Paused when stopped there", () => {
    const clock = setup({ playing: true });
    expect(text()).toBe("Live");
    act(() => clock.pause());
    expect(text()).toBe("Paused");
    act(() => clock.play());
    expect(text()).toBe("Live");
  });

  // Protects against: looking at an old moment while thinking it is current, or a wrong gap to the newest
  it("says how far behind live you are after moving back, and returns to Live", () => {
    const clock = setup({ playing: true });
    act(() => clock.seek(740));
    expect(text()).toBe("Replay · 5:40 behind live");
    act(() => clock.tick(10)); // both move on together, so the gap holds
    expect(text()).toBe("Replay · 5:40 behind live");
    act(() => clock.goLive());
    expect(text()).toBe("Live");
  });

  // Protects against: a finished exercise claiming to be live, or a replay claiming to be behind a live that has ended
  it("says Complete at the end of a finished exercise, and Replay before it", () => {
    const clock = setup({ edge: 1800, time: 1800 });
    expect(text()).toBe("Complete");
    act(() => clock.seek(600));
    expect(text()).toBe("Replay");
  });
});
