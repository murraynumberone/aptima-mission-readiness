import { Profiler } from "react";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { currentRun } from "../data/runs";
import { MetricReadout } from "../features/overview/MetricReadout";
import { createClock } from "../lib/clock";
import { ClockProvider } from "../lib/clock-react";
import { spokenText } from "../test-utils";
import { App } from "./App";
import { ThemeProvider } from "./ThemeProvider";

function setup(time?: number) {
  const clock = createClock({ duration: currentRun.durationSec, edge: currentRun.initialEdgeSec, time });
  const utils = render(
    <ThemeProvider>
      <App run={currentRun} clock={clock} drive={false} />
    </ThemeProvider>,
  );
  return { clock, user: userEvent.setup(), ...utils };
}

describe("Mission Readiness overview", () => {
  // Protects against: the landing view losing its title, exercise or team, or showing the wrong status
  it("shows the exercise header with status In Progress", () => {
    setup();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Mission Readiness");
    expect(screen.getByText("Coastal Response Simulation (Exercise 24-B)")).toBeInTheDocument();
    expect(screen.getByText("Alpha 3")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  // Protects against: the in-app disclaimer disappearing
  it("states the non-affiliation disclaimer in the footer", () => {
    setup();
    expect(within(screen.getByRole("contentinfo")).getByText(/Not affiliated with/)).toBeInTheDocument();
  });

  // Protects against: a metric appearing without its definition
  it("gives every metric a plain-language definition", () => {
    setup();
    const metrics = within(screen.getByRole("region", { name: "Team metrics" }));
    for (const label of ["Readiness", "Exercise Score", "Alerts"]) {
      expect(metrics.getByText(label)).toBeInTheDocument();
    }
    expect(metrics.getByText(/Share of training criteria/)).toBeInTheDocument();
  });

  // Protects against: the team list losing table semantics, so screen readers can't navigate it
  it("renders operators in a real table with headers", () => {
    setup();
    const table = screen.getByRole("table", { name: /Operators in Team Alpha 3/ });
    expect(within(table).getAllByRole("columnheader")).toHaveLength(6);
    expect(within(table).getAllByRole("rowheader")).toHaveLength(4);
  });

  // Protects against: status that relies on color alone, which is invisible in Night
  it("flags Attention with a text label, not color alone", () => {
    setup();
    const row = screen.getByRole("row", { name: /Operator 03/ });
    expect(within(row).getByText("Attention")).toBeInTheDocument();
  });

  // Protects against: panels drifting out of sync with the playback clock
  it("updates every panel when the clock moves", async () => {
    const { user } = setup(); // at the live edge, 18:00
    expect(screen.getByLabelText("18 minutes elapsed")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Exercise timeline" })).toHaveValue("1080");

    await user.click(screen.getByRole("button", { name: "Previous event" }));
    expect(screen.getByLabelText("16 minutes 30 seconds elapsed")).toBeInTheDocument(); // b-06 at 990
    expect(screen.getByRole("slider", { name: "Exercise timeline" })).toHaveValue("990");
  });

  // Protects against: metrics showing the end state instead of the selected moment, or leaking future alerts
  it("shows the alert count and latest event as of the selected moment", () => {
    const { clock } = setup(0);
    expect(screen.getByText(/No events before this moment/)).toBeInTheDocument();
    const alertValue = () => spokenText(screen.getByText("Alerts").nextElementSibling!);
    expect(alertValue()).toBe("0");

    act(() => clock.seek(540));
    expect(alertValue()).toBe("1");
    expect(screen.getByText(/Latest event/)).toHaveTextContent("Missed alert: channel congestion");
  });

  // Protects against: the alert pulse showing when nothing is active, or the card saying nothing is happening when something is
  it("says whether an alert is active right now, in words, not only with a pulsing dot", () => {
    const { clock } = setup(540); // the missed alert at 9:00 has just happened
    expect(screen.getByText("Active now: 1 in the last 90 s")).toBeInTheDocument();
    act(() => clock.seek(700)); // 160 s later, nothing new
    expect(screen.getByText("None in the last 90 s")).toBeInTheDocument();
  });

  // Protects against: a button whose icon disagrees with its label, or an old icon left behind after the swap
  // animation
  it("shows the icon that matches the button's label, and only one icon, after every toggle", async () => {
    const { user } = setup();
    const primary = () => within(screen.getByRole("region", { name: "Playback" })).getAllByRole("button")[0]!;
    // the app starts paused, so the first click starts playback
    for (const expected of [
      ["Pause", "lucide-pause"],
      ["Play", "lucide-play"],
      ["Pause", "lucide-pause"],
    ] as const) {
      await user.click(primary());
      expect(primary()).toHaveAccessibleName(expected[0]);
      const icons = primary().querySelectorAll("svg");
      expect(icons).toHaveLength(1);
      expect(icons[0]).toHaveClass(expected[1]);
    }
  });

  // Protects against: moving content that can't be stopped (WCAG 2.2.2)
  it("can pause and resume, and the control says which it will do", async () => {
    const { clock, user } = setup();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(clock.getState().playing).toBe(true);
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(clock.getState().playing).toBe(false);
  });

  // Protects against: no way back to the live edge, or a Next button that runs past it
  it("goes live after scrubbing back, and disables forward at the edge", async () => {
    const { user } = setup(300);
    await user.click(screen.getByRole("button", { name: "Go live" }));
    expect(screen.getByLabelText("18 minutes elapsed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next event" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Go live" })).toBeDisabled();
  });

  // Protects against: a code comment leaking onto the page as visible text (a JSX comment that lost its braces)
  it("renders no code comments as text", () => {
    localStorage.setItem("mr-notes-open", "true");
    const { container } = setup();
    expect(container.textContent).not.toMatch(/\/\*|\*\/|^\s*\/\//m);
  });

  // Protects against: a finished exercise still reading In Progress
  it("flips to Complete when the exercise ends", () => {
    const { clock } = setup();
    act(() => {
      clock.play();
      clock.tick(10_000);
    });
    expect(screen.getByText("Status", { selector: "dt" }).nextElementSibling).toHaveTextContent("Complete");
    expect(screen.queryByText("In Progress")).not.toBeInTheDocument();
  });

  // Protects against: scrubbing turning janky because every panel re-renders on every frame
  it("re-renders a panel only when its sample or alert count changes, not on every tick", () => {
    const clock = createClock({ duration: 1800, edge: 1080, time: 0 });
    let commits = 0;
    render(
      <ClockProvider clock={clock} drive={false}>
        <Profiler id="metrics" onRender={() => commits++}>
          <MetricReadout run={currentRun} />
        </Profiler>
      </ClockProvider>,
    );
    const initial = commits;

    act(() => clock.seek(3)); // same 10 s sample as t=0, no new alert
    act(() => clock.seek(7));
    expect(commits).toBe(initial);

    act(() => clock.seek(10)); // next sample
    expect(commits).toBe(initial + 1);
  });
});
