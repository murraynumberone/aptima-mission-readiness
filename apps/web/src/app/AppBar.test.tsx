import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { currentRun } from "../data/runs";
import { createClock } from "../lib/clock";
import { App } from "./App";
import { ThemeProvider } from "./ThemeProvider";

function setup() {
  const clock = createClock({ duration: currentRun.durationSec, edge: currentRun.initialEdgeSec });
  render(
    <ThemeProvider>
      <App run={currentRun} clock={clock} drive={false} />
    </ThemeProvider>,
  );
}

describe("app bar", () => {
  // Protects against: the logo, title or global controls going missing, or a second banner landmark confusing screen readers
  it("is the one banner, holding the logo, the page title and the global controls", () => {
    setup();
    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("img", { name: "Aptima" })).toBeInTheDocument();
    expect(within(banner).getByRole("heading", { level: 1, name: "Mission Readiness" })).toBeInTheDocument();
    expect(within(banner).getByRole("group", { name: "Theme" })).toBeInTheDocument();
    expect(within(banner).getByRole("button", { name: "Display" })).toBeInTheDocument();
    expect(screen.getAllByRole("banner")).toHaveLength(1);
  });

  // Protects against: the logo appearing without any sign next to it that this is a concept, and the footer losing the disclaimer
  it("marks the project as a concept beside the logo and keeps the disclaimer in the footer", () => {
    setup();
    expect(within(screen.getByRole("banner")).getByText("Concept project")).toBeInTheDocument();
    expect(within(screen.getByRole("contentinfo")).getByText(/Not affiliated with/)).toBeInTheDocument();
  });
});
