import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { currentRun } from "../data/runs";
import type { Run } from "../data/types";
import { RunLoader } from "./RunLoader";

function setup(load: () => Promise<Run>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RunLoader load={load}>{(run) => <h1>{run.name}</h1>}</RunLoader>
    </QueryClientProvider>,
  );
}

describe("loading the exercise", () => {
  // Protects against: the dashboard rendering before its data exists, or the loading placeholder staying on top of it
  it("shows the app with the loaded run and removes the loading placeholder", async () => {
    document.body.insertAdjacentHTML("afterbegin", '<div id="app-shell">Loading</div>');
    setup(() => Promise.resolve(currentRun));
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: currentRun.name })).toBeInTheDocument();
    expect(document.getElementById("app-shell")).toBeNull();
  });

  // Protects against: a failed load leaving a blank page with no explanation and no way forward
  it("says what went wrong and lets the user try again", async () => {
    const user = userEvent.setup();
    const load = vi.fn<() => Promise<Run>>().mockRejectedValueOnce(new Error("network")).mockResolvedValue(currentRun);
    document.body.insertAdjacentHTML("afterbegin", '<div id="app-shell">Loading</div>');
    setup(load);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load/i);
    expect(document.getElementById("app-shell"), "the loading placeholder is still covering the error").toBeNull();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: currentRun.name })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
