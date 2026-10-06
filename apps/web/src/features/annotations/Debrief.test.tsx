import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { App } from "../../app/App";
import { ThemeProvider } from "../../app/ThemeProvider";
import { currentRun } from "../../data/runs";
import { createAnnotations } from "../../lib/annotations";
import { createClock } from "../../lib/clock";

function setup(time = 100, { playing = false, sheetOpen = true } = {}) {
  // The sheet is folded away until wanted and remembers how it was left, so these tests start with it open.
  if (sheetOpen) localStorage.setItem("mr-notes-open", "true");
  const clock = createClock({ duration: currentRun.durationSec, edge: currentRun.initialEdgeSec, time, playing });
  const annotations = createAnnotations(currentRun.id, { storage: null });
  const ui = (
    <ThemeProvider>
      <App run={currentRun} clock={clock} annotations={annotations} drive={false} />
    </ThemeProvider>
  );
  const utils = render(ui);
  return { clock, user: userEvent.setup(), ui, ...utils };
}
const noteBox = () => screen.getByRole("textbox", { name: "Note" });
const notes = () => within(screen.getByRole("region", { name: "Notes" }));

async function saveNote(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(noteBox(), text);
  await user.click(screen.getByRole("button", { name: "Save note" }));
}

describe("composer", () => {
  // Protects against: a note with no stated time or subject, or no guidance when there are no notes yet
  it("says what the moment is, and starts with purposeful empty states", () => {
    setup(100);
    expect(screen.getByText(/Note for/).textContent).toContain("1:40 · no event at this moment");
    expect(screen.getByText(/No notes yet\. Move the timeline/)).toBeInTheDocument();
    expect(screen.getByText("Reviewed 0 of 6 events")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Review status" })).not.toBeInTheDocument();
  });

  // Protects against: reviewing an event with no review control, or offering one where there is no event
  it("names the event when the timeline is on one, and offers a review status", () => {
    setup(540);
    expect(screen.getByText(/Note for/).textContent).toContain("9:00 · Missed alert: channel congestion");
    expect(screen.getByRole("group", { name: "Review status" })).toBeInTheDocument();
  });

  // Protects against: review hints living only in a title attribute, which keyboard and touch users never see. The
  // selected hint also sits in a screen-reader-only paragraph, so this looks for a visible copy.
  it("shows what a review status means when you hover it or arrow to it", async () => {
    const { user } = setup(540);
    const seen = (hint: string) => screen.queryAllByText(hint).filter((el) => !el.closest(".sr-only"));

    await user.hover(screen.getByRole("radio", { name: "Adjusted" }));
    await waitFor(() => expect(seen("Recorded, with a correction. Say what in a note.")).toHaveLength(1));
    await user.hover(document.body); // pointer away

    act(() => noteBox().focus());
    await user.tab({ shift: true }); // into the review options from the keyboard, with no pointer involved
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Dismissed" })).toHaveFocus();
    await waitFor(() => expect(seen("Not relevant to the debrief.")).toHaveLength(1));
  });

  // Protects against: a save with no confirmation, a box that keeps old text, or focus jumping away
  it("saves a moment note, confirms in place, clears the box, and keeps focus on Save", async () => {
    const { user } = setup(100);
    await saveNote(user, "Watch lead was on the radio");
    const list = within(notes().getByRole("list"));
    expect(list.getByText("Watch lead was on the radio")).toBeInTheDocument();
    expect(list.getByText("Moment note")).toBeInTheDocument();
    expect(screen.getByText("Note saved at 1:40.")).toBeInTheDocument();
    expect(noteBox()).toHaveValue("");
    expect(screen.getByRole("button", { name: "Save note" })).toHaveFocus();
  });

  // Protects against: an empty note saving silently, or an error that isn't announced or focusable
  it("won't save an empty note, says why, and puts focus in the box", async () => {
    const { user } = setup(100);
    await user.click(screen.getByRole("button", { name: "Save note" }));
    expect(screen.getByText("Write a note before saving.")).toBeInTheDocument();
    expect(noteBox()).toHaveAttribute("aria-invalid", "true");
    expect(noteBox()).toHaveAccessibleDescription("Write a note before saving.");
    expect(noteBox()).toHaveFocus();
    await user.type(noteBox(), "x");
    expect(screen.queryByText("Write a note before saving.")).not.toBeInTheDocument();
  });

  // Protects against: a note on an event losing the link to it, or the event row not showing it has notes
  it("attaches the note to the event and shows the count on the event row", async () => {
    const { user } = setup(540);
    await saveNote(user, "Missed it");
    const item = within(notes().getByRole("list")).getByRole("listitem");
    expect(item).toHaveTextContent("Missed alert: channel congestion");
    expect(item).toHaveTextContent("Unreviewed");
    expect(
      screen
        .getByRole("button", { name: /Missed alert: channel congestion/, description: /did not acknowledge/ })
        .closest("li"),
    ).toHaveTextContent("1 note");
  });

  // Protects against: a note being saved at a different time than the one it was started at
  it("holds the moment from the first keystroke, even while the clock moves", async () => {
    const { user, clock } = setup(100);
    await user.type(noteBox(), "starting");
    act(() => clock.seek(400));
    expect(screen.getByText(/Note for/).textContent).toContain("1:40");
    expect(screen.getByText(/held, clock is at/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save note" }));
    expect(
      within(notes().getByRole("list")).getByRole("button", { name: "Go to 1:40 on the timeline" }),
    ).toBeInTheDocument();
  });
});

describe("review status", () => {
  // Protects against: a review that doesn't stick, doesn't show on the event row, or doesn't update the summary
  it("applies immediately, shows on the event row and in the summary, and says so", async () => {
    const { user } = setup(540);
    await user.click(screen.getByRole("radio", { name: "Confirmed" }));
    expect(screen.getByRole("radio", { name: "Confirmed" })).toBeChecked();
    expect(screen.getByText("Review set to confirmed for 9:00.")).toBeInTheDocument();
    expect(screen.getByText("Reviewed 1 of 6 events")).toBeInTheDocument();
    const row = within(screen.getByRole("region", { name: "Events" }))
      .getByRole("button", { name: /Missed alert: channel congestion/ })
      .closest("li")!;
    expect(row).toHaveTextContent("Confirmed");
    expect(screen.getByRole("radio", { name: "Confirmed" })).toHaveAccessibleDescription(
      "Agree with how the system recorded this.",
    );
  });
});

describe("losing a draft", () => {
  const leave = () => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented; // true means the browser will ask "leave this page?"
  };

  // Protects against: a half-written note, or unsaved edits, vanishing on an accidental reload
  it("asks before leaving while a note is half-written or half-edited, and not otherwise", async () => {
    const { user } = setup(100);
    expect(leave()).toBe(false); // nothing to lose
    await user.type(noteBox(), "half a thought");
    expect(leave()).toBe(true);
    await user.click(screen.getByRole("button", { name: "Save note" }));
    expect(leave()).toBe(false); // saved, nothing left to lose

    await user.click(screen.getByRole("button", { name: /Edit note at 1:40/ }));
    expect(leave()).toBe(false); // opened but unchanged
    await user.type(screen.getByRole("textbox", { name: /Edit note at 1:40/ }), " more");
    expect(leave()).toBe(true);
    await user.keyboard("{Escape}");
    expect(leave()).toBe(false); // discarded on purpose
  });
});

describe("reviewing while the clock is running", () => {
  const eventRow = (title: RegExp) =>
    within(screen.getByRole("region", { name: "Events" })).getByRole("button", { name: title });
  const context = () => screen.getByText(/Note for/).textContent;

  // Protects against: the reported bug: the review control vanishing because the running clock ticks off the event
  it("stays on the event you jumped to, so its review is still there after the clock ticks on", async () => {
    const { user, clock } = setup(100, { playing: true });
    await user.click(eventRow(/Missed alert: channel congestion/));
    act(() => clock.tick(5)); // 9:05, no longer on the event
    expect(context()).toContain("9:00 · Missed alert: channel congestion");
    expect(screen.getByRole("group", { name: "Review status" })).toBeInTheDocument();
    expect(screen.getByText(/held, clock is at/).textContent).toContain("9:05");

    await user.click(screen.getByRole("radio", { name: "Confirmed" }));
    expect(screen.getByText("Review set to confirmed for 9:00.")).toBeInTheDocument();
    expect(screen.getByText("Reviewed 1 of 6 events")).toBeInTheDocument();
  });

  // Protects against: the hold working from the event list but not from other ways of jumping
  it("holds for every kind of jump, not just the event list", async () => {
    const { user, clock } = setup(100, { playing: true });
    await user.click(screen.getByRole("button", { name: "Next event" })); // 3:00
    act(() => clock.tick(4));
    expect(context()).toContain("3:00 · Initial report received");
    await user.click(screen.getByRole("button", { name: "Jump to 5:00: Track monitoring handed to autonomy" }));
    act(() => clock.tick(4));
    expect(context()).toContain("5:00 · Track monitoring handed to autonomy");
  });

  // Protects against: being stuck on an old event with no way back to the live moment
  it("Follow clock lets go of the event and goes back to the live time", async () => {
    const { user, clock } = setup(100, { playing: true });
    await user.click(eventRow(/Missed alert: channel congestion/));
    act(() => clock.tick(5));
    await user.click(screen.getByRole("button", { name: "Follow clock" }));
    expect(context()).toContain("9:05 · no event at this moment");
    expect(screen.queryByRole("button", { name: "Follow clock" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Review status" })).not.toBeInTheDocument();
  });

  // Protects against: scrubbing the timeline silently changing a note's time mid-sentence
  it("keeps a half-written note on its own moment when you scrub elsewhere", async () => {
    const { user, clock } = setup(100, { playing: true });
    await user.type(noteBox(), "writing about 1:40");
    act(() => clock.seek(540));
    expect(context()).toContain("1:40");
    await user.click(screen.getByRole("button", { name: "Save note" }));
    expect(
      within(notes().getByRole("list")).getByRole("button", { name: "Go to 1:40 on the timeline" }),
    ).toBeInTheDocument();
  });

  // Protects against: the review control vanishing right after saving a note on an event, or moment notes clinging on
  it("stays on the event after saving a note on it, so the review can continue; a moment note lets go", async () => {
    const { user, clock } = setup(100, { playing: true });
    await user.click(eventRow(/Missed alert: channel congestion/));
    act(() => clock.tick(5));
    await saveNote(user, "about the event");
    expect(context()).toContain("9:00 · Missed alert: channel congestion");
    expect(screen.getByRole("group", { name: "Review status" })).toBeInTheDocument();

    act(() => clock.seek(700));
    await saveNote(user, "just a moment");
    act(() => clock.tick(3));
    expect(context()).toContain("11:43 · no event at this moment");
  });
});

describe("editing and deleting", () => {
  async function withNote() {
    const ctx = setup(100);
    await saveNote(ctx.user, "original text");
    return ctx;
  }

  // Protects against: edits that don't save, or focus lost after editing
  it("edits a note, returns focus to Edit, and says so", async () => {
    const { user } = await withNote();
    await user.click(screen.getByRole("button", { name: /Edit note at 1:40/ }));
    const field = screen.getByRole("textbox", { name: /Edit note at 1:40/ });
    expect(field).toHaveFocus();
    await user.clear(field);
    await user.type(field, "revised text");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("revised text")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit note at 1:40/ })).toHaveFocus();
    expect(screen.getByText("Note at 1:40 updated.")).toBeInTheDocument();
  });

  // Protects against: a note deleted by accident, or no safe way out of the confirm
  it("asks before deleting, defaults focus to Cancel, and Escape backs out", async () => {
    const { user } = await withNote();
    await user.click(screen.getByRole("button", { name: /Delete note at 1:40/ }));
    expect(screen.getByText("Delete this note?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Delete this note?")).not.toBeInTheDocument();
    expect(screen.getByText("original text")).toBeInTheDocument();
  });

  // Protects against: a deleted note leaving focus stranded on a removed element
  it("deletes after confirmation, says so, and moves focus to the note box", async () => {
    const { user } = await withNote();
    await user.click(screen.getByRole("button", { name: /Delete note at 1:40/ }));
    await user.click(screen.getByRole("button", { name: "Yes, delete" }));
    expect(screen.queryByText("original text")).not.toBeInTheDocument();
    expect(screen.getByText("Note at 1:40 deleted.")).toBeInTheDocument();
    expect(noteBox()).toHaveFocus();
  });
});

describe("accessibility", () => {
  // Protects against: accessibility violations in the notes UI, including edit mode (the only place that state is scanned)
  it("has no detectable axe violations with a note, a review and edit mode open", async () => {
    const { user, container } = setup(540);
    await user.click(screen.getByRole("radio", { name: "Adjusted" }));
    await saveNote(user, "A note");
    await user.click(screen.getByRole("button", { name: /Edit note at 9:00/ }));
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
  });
});
