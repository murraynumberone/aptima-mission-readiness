import { describe, expect, it } from "vitest";
import { createAnnotations } from "./annotations";

const FIXED = new Date("2026-10-04T12:00:00Z");
const make = (runId = "run-a", opts = {}) => createAnnotations(runId, { now: () => FIXED, ...opts });

describe("annotations store", () => {
  // Protects against: notes losing their time, event link or timestamps
  it("adds a trimmed note with timestamps, attached to an event or not", () => {
    const store = make();
    const note = store.add({ t: 540, text: "  Missed the congestion alert  ", eventId: "b-03" })!;
    expect(note).toMatchObject({ t: 540, text: "Missed the congestion alert", eventId: "b-03", runId: "run-a" });
    expect(note.createdAt).toBe(FIXED.toISOString());
    expect(store.add({ t: 12, text: "General observation" })!.eventId).toBeUndefined();
    expect(store.getState().annotations).toHaveLength(2);
  });

  // Protects against: blank notes cluttering the debrief
  it("ignores an empty or whitespace-only note", () => {
    const store = make();
    expect(store.add({ t: 1, text: "   " })).toBeUndefined();
    expect(store.getState().annotations).toEqual([]);
  });

  // Protects against: edits or deletes that don't take effect, or an edit that blanks a note
  it("edits and removes a note", () => {
    const store = make();
    const { id } = store.add({ t: 1, text: "first" })!;
    store.update(id, "second");
    expect(store.getState().annotations[0]!.text).toBe("second");
    store.update(id, "   "); // an empty edit is ignored
    expect(store.getState().annotations[0]!.text).toBe("second");
    store.remove(id);
    expect(store.getState().annotations).toEqual([]);
  });

  // Protects against: a review that can't be set, cleared, or dated
  it("sets a review status with a timestamp, and clears it when set back to unreviewed", () => {
    const store = make();
    store.setReview("b-03", "confirmed");
    expect(store.getState().reviews["b-03"]).toEqual({ status: "confirmed", updatedAt: FIXED.toISOString() });
    store.setReview("b-03", "unreviewed");
    expect(store.getState().reviews).toEqual({});
  });
});

describe("persistence", () => {
  // Protects against: losing the debrief on reload
  it("survives a reload", () => {
    const first = make();
    first.add({ t: 540, text: "kept", eventId: "b-03" });
    first.setReview("b-03", "adjusted");
    const second = make();
    expect(second.getState().annotations[0]).toMatchObject({ text: "kept", eventId: "b-03" });
    expect(second.getState().reviews["b-03"]!.status).toBe("adjusted");
  });

  // Protects against: one exercise's notes appearing in another
  it("keeps runs separate", () => {
    make("run-a").add({ t: 1, text: "only in a" });
    expect(make("run-b").getState().annotations).toEqual([]);
  });

  // Protects against: bad saved data taking the app down: a corrupted value, one bad entry spoiling the good ones,
  // or blocked storage. Each case is checked on its own.
  it("bad saved data never breaks the notes", () => {
    localStorage.setItem("mr-debrief-v1:run-a", "{not json");
    expect(make().getState()).toEqual({ annotations: [], reviews: {} });

    localStorage.setItem(
      "mr-debrief-v1:run-a",
      JSON.stringify({
        annotations: [
          { id: "ok", runId: "run-a", t: 5, text: "good", createdAt: "2026-01-01T00:00:00Z" },
          { id: "no-text", runId: "run-a", t: 5, createdAt: "x" },
          { id: "other-run", runId: "run-z", t: 5, text: "wrong run", createdAt: "x" },
          "junk",
        ],
        reviews: { "b-01": { status: "confirmed", updatedAt: "x" }, "b-02": { status: "nope", updatedAt: "x" } },
      }),
    );
    const { annotations, reviews } = make().getState();
    expect(annotations.map((a) => a.id)).toEqual(["ok"]);
    expect(Object.keys(reviews)).toEqual(["b-01"]);

    const boom = () => {
      throw new Error("blocked");
    };
    const blocked = make("run-a", { storage: { getItem: boom, setItem: boom } });
    expect(() => blocked.add({ t: 1, text: "still here" })).not.toThrow();
    expect(blocked.getState().annotations).toHaveLength(1);
  });
});
