import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../app/App";
import { ThemeProvider } from "../../app/ThemeProvider";
import { currentRun } from "../../data/runs";
import { createAnnotations } from "../../lib/annotations";
import { createClock } from "../../lib/clock";

function setup(time = 100) {
  const clock = createClock({ duration: currentRun.durationSec, edge: currentRun.initialEdgeSec, time });
  const ui = (
    <ThemeProvider>
      <App
        run={currentRun}
        clock={clock}
        annotations={createAnnotations(currentRun.id, { storage: null })}
        drive={false}
      />
    </ThemeProvider>
  );
  return { user: userEvent.setup(), ui, ...render(ui) };
}
const trigger = () => screen.getByRole("button", { name: /^Notes/ });
const noteBox = () => screen.queryByRole("textbox", { name: "Note" });

describe("notes sheet", () => {
  // Protects against: the notes taking up screen space, or being reachable by keyboard, when nobody has asked for them
  it("starts folded away: slim bar showing the count, the note box out of reach", () => {
    setup();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveTextContent("Notes 0");
    expect(noteBox()).not.toBeInTheDocument(); // hidden content is out of the tab order and the accessibility tree
    // The summary also exists in the folded panel, but only the bar's copy is visible.
    const visible = screen.getAllByText("Reviewed 0 of 6 events").filter((el) => !el.closest("[hidden]"));
    expect(visible).toHaveLength(1);
  });

  // Protects against: having to re-open the sheet on every visit, or it opening itself for someone who closed it
  it("opens and folds on the bar's button, and remembers how it was left", async () => {
    const { user, unmount, ui } = setup();
    await user.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(noteBox()).toBeInTheDocument();
    unmount();

    render(ui); // a later visit
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    await userEvent.setup().click(trigger());
    unmount();
    document.body.innerHTML = "";
    render(ui);
    expect(trigger()).toHaveAttribute("aria-expanded", "false"); // closed again, and stays closed
  });

  // Protects against: "Add note" opening the sheet but leaving you to find the note box, or only focusing it when already open
  it("the toolbar's Add note opens the sheet and puts the cursor in the note box", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Add note" }));
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    await vi.waitFor(() => expect(noteBox()).toHaveFocus());
  });

  // Protects against: losing a half-written note by folding the sheet away to look at something
  it("keeps a half-written note when folded away and opened again", async () => {
    const { user } = setup();
    await user.click(trigger());
    await user.type(noteBox()!, "Half a thought");
    await user.click(trigger());
    expect(noteBox()).not.toBeInTheDocument();
    await user.click(trigger());
    expect(noteBox()).toHaveValue("Half a thought");
  });

  // Protects against: Escape trapping you in the sheet, or dropping focus somewhere random when it folds
  it("Escape folds it away and returns focus to its bar button", async () => {
    const { user } = setup();
    await user.click(trigger());
    await user.click(noteBox()!);
    await user.keyboard("{Escape}");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    await vi.waitFor(() => expect(trigger()).toHaveFocus());
  });

  // Protects against: backing out of a delete confirmation or an edit also folding the whole sheet away
  it("Escape inside an edit or a delete confirmation cancels only that, not the sheet", async () => {
    const { user } = setup();
    await user.click(trigger());
    await user.type(noteBox()!, "A note");
    await user.click(screen.getByRole("button", { name: "Save note" }));
    const sheet = within(screen.getByRole("region", { name: "Notes" }));

    await user.click(sheet.getByRole("button", { name: /Delete note at 1:40/ }));
    await user.keyboard("{Escape}");
    expect(sheet.queryByText("Delete this note?")).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute("aria-expanded", "true"); // still open

    await user.click(sheet.getByRole("button", { name: /Edit note at 1:40/ }));
    await user.keyboard("{Escape}");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  // Protects against: the count on the bar being stale, so you can't tell at a glance that notes exist
  it("shows how many notes there are, even folded away", async () => {
    const { user } = setup();
    await user.click(trigger());
    for (const text of ["one", "two"]) {
      await user.type(noteBox()!, text);
      await user.click(screen.getByRole("button", { name: "Save note" }));
    }
    await user.click(trigger());
    expect(trigger()).toHaveTextContent("Notes 2");
  });
});
