import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../app/App";
import { ThemeProvider } from "../../app/ThemeProvider";
import { currentRun } from "../../data/runs";
import { createAnnotations } from "../../lib/annotations";
import { createClock } from "../../lib/clock";
import { spokenText } from "../../test-utils";

function setup(time = 1080) {
  const clock = createClock({ duration: currentRun.durationSec, edge: currentRun.initialEdgeSec, time });
  const utils = render(
    <ThemeProvider>
      <App
        run={currentRun}
        clock={clock}
        annotations={createAnnotations(currentRun.id, { storage: null })}
        drive={false}
      />
    </ThemeProvider>,
  );
  return { clock, ...utils };
}
const chart = () => within(screen.getByRole("region", { name: "Performance over time" }));
const tableRows = () =>
  chart()
    .getByRole("table", { name: /at the start of each minute/, hidden: true })
    .querySelectorAll("tbody tr");

describe("performance chart", () => {
  // Protects against: the chart showing time that hasn't happened yet, or not growing as the exercise advances
  it("covers only the exercise so far, and grows as it advances", () => {
    const { clock } = setup();
    const times = () => [...tableRows()].map((r) => r.querySelector("th")!.textContent);
    expect(times().at(-1)).toBe("18:00");
    expect(times()).not.toContain("19:00");

    act(() => {
      clock.play();
      clock.tick(60); // a minute of the exercise passes
    });
    expect(times().at(-1)).toBe("19:00");
  });

  // Protects against: the chart and the metric cards disagreeing about the same moment
  it("shows the same numbers as the metric cards, at whatever moment is selected", () => {
    const { clock } = setup();
    for (const t of [0, 540, 1000]) {
      act(() => clock.seek(t));
      const legend = chart().getByRole("list").textContent!;
      const cards = within(screen.getByRole("region", { name: "Team metrics" }));
      const card = (label: string) => spokenText(cards.getByText(label).parentElement!.querySelector("dd")!);
      expect(legend).toContain(`Readiness${card("Readiness")}`);
      expect(legend).toContain(`Exercise Score${card("Exercise Score")}`);
    }
  });

  // Protects against: the two series being identical for anyone who can't tell the colors apart
  it("tells the two series apart by line style and marker, not color alone", () => {
    setup();
    const readiness = screen.getByTestId("line-readiness");
    const score = screen.getByTestId("line-score");
    expect(score.getAttribute("stroke-dasharray")).toBeTruthy();
    expect(readiness.getAttribute("stroke-dasharray")).toBeFalsy();
    const cursor = screen.getByTestId("chart-cursor").parentElement!;
    expect(cursor.querySelector("circle")).toBeInTheDocument(); // one series ends in a circle...
    expect(cursor.querySelector("rect")).toBeInTheDocument(); // ...the other in a square
  });
});
