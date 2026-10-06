import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../app/App";
import { ThemeProvider } from "../../app/ThemeProvider";
import { currentRun } from "../../data/runs";
import { createClock } from "../../lib/clock";

function setup(time = 1080) {
  const clock = createClock({ duration: currentRun.durationSec, edge: currentRun.initialEdgeSec, time });
  const utils = render(
    <ThemeProvider>
      <App run={currentRun} clock={clock} drive={false} />
    </ThemeProvider>,
  );
  return { clock, user: userEvent.setup(), ...utils };
}
const panel = () => screen.getByRole("region", { name: "Operator detail" });
const open03 = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: /Why attention\? Operator 03/ }));

describe("operator rows are actionable", () => {
  // Protects against: Attention rows that aren't actionable, or buttons that don't say which operator they belong to
  it("flagged rows say why, nominal rows say details, and each names its operator", () => {
    setup();
    expect(screen.getByRole("button", { name: "Why attention? Operator 03" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Details Operator 01" })).toBeInTheDocument();
    expect(within(screen.getByRole("table", { name: /Operators in Team/ })).getAllByRole("button")).toHaveLength(4);
  });
});

describe("operator panel", () => {
  // Protects against: the panel opening without telling keyboard and screen reader users (focus must land on it)
  it("opens from an Attention row, explains why, and moves focus to the panel", async () => {
    const { user } = setup();
    await open03(user);
    const heading = within(panel()).getByRole("heading", { level: 3, name: "Operator 03" });
    expect(heading).toHaveFocus();
    expect(within(panel()).getByText(/below the 72% attention line/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Why attention\? Operator 03/ })).toHaveAttribute("aria-current", "true");
  });

  // Protects against: the Why stating a flag without the reasons, the human response, or the score change
  it("shows each cause with its explanation, the human response, and the score change in words", async () => {
    const { user } = setup();
    await open03(user);
    const causes = within(within(panel()).getByRole("list"));
    const items = causes.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Missed alert: weather update");
    expect(items[1]).toHaveTextContent("Autonomy flagged an unusual vessel track");
    expect(items[1]).toHaveTextContent("did not act within 45 seconds");
    expect(items[1]).toHaveTextContent("No action taken");
    expect(items[1]).toHaveTextContent(/Score fell \d+ to \d+/);
    expect(items[1]).toHaveTextContent("Most affected: Situational awareness");
  });

  // Protects against: a cause that can't be taken back to its moment on the timeline
  it("jumps the whole app to a cause", async () => {
    const { user, clock } = setup();
    await open03(user);
    await user.click(within(panel()).getByRole("button", { name: /Show 12:20 on the timeline/ }));
    expect(clock.getState().time).toBe(740);
    expect(within(panel()).getByText(/below the 60% critical line/)).toBeInTheDocument();
  });

  // Protects against: the panel revealing events that haven't happened yet
  it("follows the clock: events appear only once they've happened", async () => {
    const { user, clock } = setup(0);
    await user.click(screen.getByRole("button", { name: /Operator 03/ }));
    expect(within(panel()).getByText(/No events involving Operator 03 yet/)).toBeInTheDocument();
    act(() => clock.seek(540));
    expect(within(panel()).getAllByRole("listitem")).toHaveLength(1);
  });

  // Protects against: the weakest area being marked by a bar alone
  it("shows the lowest skill area with a text label, not only a bar", async () => {
    const { user } = setup();
    await open03(user);
    expect(within(panel()).getAllByText("Lowest")).toHaveLength(1);
    expect(within(panel()).getAllByRole("definition").length).toBe(4);
  });

  // Protects against: closing the panel and dropping keyboard users at the top of the page
  it("closes with the button and returns focus to the row that opened it", async () => {
    const { user } = setup();
    await open03(user);
    await user.click(within(panel()).getByRole("button", { name: "Close operator detail" }));
    expect(within(panel()).getByText(/Select an operator/)).toBeInTheDocument();
    await act(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    expect(screen.getByRole("button", { name: /Why attention\? Operator 03/ })).toHaveFocus();
  });
});

describe("event list explains each event", () => {
  // Protects against: an event's explanation never reaching screen reader users
  it("shows the detail text and ties it to its button for screen readers", () => {
    setup();
    const btn = screen.getByRole("button", {
      name: /Autonomy flagged an unusual vessel track/,
      description: /did not act within 45 seconds/,
    });
    expect(btn).toBeInTheDocument();
  });
});
