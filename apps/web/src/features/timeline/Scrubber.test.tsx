import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../app/App";
import { ThemeProvider } from "../../app/ThemeProvider";
import { currentRun } from "../../data/runs";
import { createClock } from "../../lib/clock";
import { SETTLE_MS } from "./LiveSummary";

function setup(time = 300) {
  const clock = createClock({ duration: currentRun.durationSec, edge: currentRun.initialEdgeSec, time });
  render(
    <ThemeProvider>
      <App run={currentRun} clock={clock} drive={false} />
    </ThemeProvider>,
  );
  return { clock, user: userEvent.setup(), slider: screen.getByRole("slider", { name: "Exercise timeline" }) };
}

afterEach(() => vi.useRealTimers());

describe("Scrubber semantics", () => {
  // Protects against: a screen reader hearing a raw number of seconds instead of a readable time
  it("reads human time as aria-valuetext", () => {
    const { slider } = setup(760);
    expect(slider).toHaveAttribute("aria-valuetext", "12 minutes 40 seconds elapsed");
  });

  // Protects against: a screen reader not being told when the thumb is on an event, and which operator
  it("adds the event and operator to aria-valuetext when on an event", () => {
    const { slider } = setup(540);
    expect(slider).toHaveAttribute(
      "aria-valuetext",
      "9 minutes elapsed. Event: Missed alert: channel congestion, Operator 03.",
    );
  });
});

describe("Scrubber keyboard", () => {
  // Protects against: keyboard users being unable to scrub in small and large steps
  it("Arrow moves 1 s, Shift+Arrow moves 10 s", async () => {
    const { clock, user, slider } = setup(300);
    slider.focus();
    await user.keyboard("{ArrowRight}");
    expect(clock.getState().time).toBe(301);
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(clock.getState().time).toBe(311);
    await user.keyboard("{Shift>}{ArrowLeft}{/Shift}{ArrowLeft}");
    expect(clock.getState().time).toBe(300);
  });

  // Protects against: End running into time that hasn't happened yet
  it("Home goes to the start and End stops at the live edge, not the end of the exercise", async () => {
    const { clock, user, slider } = setup(300);
    slider.focus();
    await user.keyboard("{Home}");
    expect(clock.getState().time).toBe(0);
    await user.keyboard("{End}");
    expect(clock.getState().time).toBe(1080);
    expect(slider).toHaveValue("1080");
  });

  // Protects against: no keyboard route between events
  it("] and [ jump to the next and previous event", async () => {
    const { clock, user, slider } = setup(300);
    slider.focus();
    await user.keyboard("]");
    expect(clock.getState().time).toBe(540);
    await user.keyboard("]");
    expect(clock.getState().time).toBe(740);
    await user.keyboard("[[");
    expect(clock.getState().time).toBe(540);
  });

  // Protects against: keyboard stepping getting stuck beside an event marker
  it("does not trap the thumb at a marker when stepping by keyboard", async () => {
    const { clock, user, slider } = setup(540);
    slider.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(clock.getState().time).toBe(543);
  });
});

describe("Event markers and list", () => {
  // Protects against: the timeline revealing future events
  it("shows markers and list items only for events that have happened", () => {
    setup();
    const markers = screen.getAllByRole("button", { name: /^Jump to / });
    expect(markers).toHaveLength(6); // b-01 to b-06, up to 18:00
    expect(screen.queryByRole("button", { name: /relay status/ })).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Events" })).getAllByRole("listitem")).toHaveLength(6);
  });

  // Protects against: no way to jump to an event, or the current event not being marked
  it("jumps to an event from the list and marks the current one", async () => {
    const { clock, user } = setup();
    const list = within(screen.getByRole("region", { name: "Events" })).getByRole("list");
    await user.click(within(list).getByRole("button", { name: /Missed alert: channel congestion/ }));
    expect(clock.getState().time).toBe(540);
    expect(within(list).getByRole("button", { name: /channel congestion/ })).toHaveAttribute("aria-current", "true");
  });
});

describe("Live announcements", () => {
  // Protects against: a screen reader announcing every step of a drag
  it("announces once after scrubbing settles, not on every move", () => {
    vi.useFakeTimers();
    const { clock } = setup(0);
    const status = screen.getByRole("status", { name: "Timeline summary" });
    expect(status).toHaveTextContent("");

    act(() => {
      clock.seek(100);
      clock.seek(300);
      clock.seek(540);
    });
    act(() => vi.advanceTimersByTime(SETTLE_MS - 1));
    expect(status).toHaveTextContent("");

    act(() => vi.advanceTimersByTime(1));
    expect(status).toHaveTextContent(
      "9 minutes elapsed. Event: Missed alert: channel congestion, Operator 03. 1 alert.",
    );
  });

  // Protects against: a screen reader being spoken to every second during playback
  it("stays silent while playback ticks", () => {
    vi.useFakeTimers();
    const { clock } = setup(0);
    act(() => {
      clock.play();
      clock.tick(5);
      vi.advanceTimersByTime(SETTLE_MS * 3);
    });
    expect(screen.getByRole("status", { name: "Timeline summary" })).toHaveTextContent("");
  });
});
