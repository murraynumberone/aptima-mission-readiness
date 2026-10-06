import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { currentRun } from "../data/runs";
import { createAnnotations } from "../lib/annotations";
import { createClock } from "../lib/clock";
import { App } from "./App";
import { ThemeProvider } from "./ThemeProvider";

const slider = () => screen.getByRole("slider", { name: "Exercise timeline" });
const panel = () => screen.getByRole("region", { name: "Operator detail" });
const notes = () => createAnnotations(currentRun.id, { storage: null });

describe("opening a shared link", () => {
  // Protects against: a shared link opening at the live edge (or wrong place) instead of the moment that was shared
  it("opens at the shared moment with the shared operator's detail showing, and paused", () => {
    window.history.replaceState(null, "", "/?t=540&op=op-03");
    render(
      <ThemeProvider>
        <App annotations={notes()} drive={false} />
      </ThemeProvider>,
    );
    expect(slider()).toHaveValue("540");
    expect(within(panel()).getByRole("heading", { level: 3, name: "Operator 03" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument(); // paused, so the shared moment stays put
  });

  // Protects against: a bad or hostile link breaking the page, instead of just opening normally
  it("ignores a malformed link and opens normally, playing from the live edge", () => {
    window.history.replaceState(null, "", "/?t=banana&op=nobody");
    render(
      <ThemeProvider>
        <App annotations={notes()} drive={false} />
      </ThemeProvider>,
    );
    expect(slider()).toHaveValue("1080");
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(within(panel()).getByText(/Select an operator/)).toBeInTheDocument();
  });
});

describe("the address follows the person", () => {
  const setup = () => {
    const clock = createClock({ duration: currentRun.durationSec, edge: currentRun.initialEdgeSec });
    render(
      <ThemeProvider>
        <App run={currentRun} clock={clock} annotations={notes()} drive={false} />
      </ThemeProvider>,
    );
    return { clock, user: userEvent.setup() };
  };

  // Protects against: a copied address that doesn't capture what the person is looking at
  it("records the moment when they move the timeline, and the operator when they open one", async () => {
    const { clock, user } = setup();
    act(() => clock.seek(540));
    expect(window.location.search).toContain("t=540");
    await user.click(screen.getByRole("button", { name: "Why attention? Operator 03" }));
    expect(window.location.search).toContain("op=op-03");
    await user.click(within(panel()).getByRole("button", { name: "Close operator detail" }));
    expect(window.location.search).not.toContain("op=");
    expect(window.location.search).toContain("t=540"); // closing the panel doesn't forget the moment
  });

  // Protects against: the address being rewritten every second while the exercise plays, which would flood history work and flicker
  it("doesn't rewrite the address as playback ticks on its own", () => {
    const { clock } = setup();
    const replace = vi.spyOn(window.history, "replaceState");
    act(() => {
      clock.play();
      for (let i = 0; i < 20; i++) clock.tick(1);
    });
    expect(replace).not.toHaveBeenCalled();
    replace.mockRestore();
  });
});

describe("copy link", () => {
  const setup = () => {
    const clock = createClock({ duration: currentRun.durationSec, edge: currentRun.initialEdgeSec });
    render(
      <ThemeProvider>
        <App run={currentRun} clock={clock} annotations={notes()} drive={false} />
      </ThemeProvider>,
    );
    return { clock, user: userEvent.setup() };
  };

  // Protects against: a link that doesn't point at this exact moment and operator, or no sign that it was copied
  it("copies a link to the current moment and operator, and says so in the button", async () => {
    const { clock, user } = setup(); // user-event installs its own clipboard, so mock ours after it
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    act(() => clock.seek(740));
    await user.click(screen.getByRole("button", { name: "Why critical? Operator 03" }));
    await user.click(screen.getByRole("button", { name: "Copy link" }));

    const link = new URL(writeText.mock.calls[0]![0] as string);
    expect(link.searchParams.get("t")).toBe("740");
    expect(link.searchParams.get("op")).toBe("op-03");
    expect(await screen.findByRole("button", { name: "Link copied" })).toBeInTheDocument();
  });

  // Protects against: a link from someone who only watched leaving out the moment, because the address updates
  // only on user moves
  it("includes the current moment even if the timeline was never touched", async () => {
    const { clock, user } = setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    act(() => {
      clock.play();
      clock.tick(5); // the exercise has moved on by itself; nobody dragged anything
    });
    expect(window.location.search).not.toContain("t=");
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(new URL(writeText.mock.calls[0]![0] as string).searchParams.get("t")).toBe("1085");
  });

  // Protects against: a silent failure when the browser refuses clipboard access (it does, in some contexts)
  it("says when it couldn't copy", async () => {
    const { user } = setup();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByRole("button", { name: "Couldn't copy" })).toBeInTheDocument();
  });
});

describe("attention banner", () => {
  const setup = (time: number) => {
    const clock = createClock({ duration: currentRun.durationSec, edge: currentRun.initialEdgeSec, time });
    render(
      <ThemeProvider>
        <App run={currentRun} clock={clock} annotations={notes()} drive={false} />
      </ThemeProvider>,
    );
    return { clock, user: userEvent.setup() };
  };
  const banner = () => within(screen.getByRole("region", { name: "Needs attention" }));

  // Protects against: the banner saying everything is fine when someone needs attention, or naming no one
  it("names who needs attention as the moment changes, and says when nobody does", () => {
    const { clock } = setup(0);
    expect(banner().getByText("All operators nominal at this moment.")).toBeInTheDocument();
    act(() => clock.seek(540));
    expect(banner().getByRole("button", { name: /Operator 03/ })).toBeInTheDocument();
    expect(banner().getByText("Attention")).toBeInTheDocument(); // in words, not only a shape
    expect(banner().queryByText(/All operators nominal/)).not.toBeInTheDocument();
  });

  // Protects against: opening an operator from the banner and then losing your place when you close it
  it("opens the operator, and closing returns focus to the banner button that opened it", async () => {
    const { user } = setup(540);
    await user.click(banner().getByRole("button", { name: /Operator 03/ }));
    expect(within(panel()).getByRole("heading", { level: 3, name: "Operator 03" })).toHaveFocus();
    await user.click(within(panel()).getByRole("button", { name: "Close operator detail" }));
    await act(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    expect(banner().getByRole("button", { name: /Operator 03/ })).toHaveFocus(); // not the table's button
  });
});
