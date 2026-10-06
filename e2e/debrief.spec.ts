import { expect, test, type Page } from "@playwright/test";

const eventRow = (page: Page, title: RegExp) =>
  page.getByRole("region", { name: "Events" }).getByRole("button", { name: title });
const noteBox = (page: Page) => page.getByRole("textbox", { name: "Note", exact: true });
const slider = (page: Page) => page.getByRole("slider", { name: "Exercise timeline" });

test.beforeEach(async ({ page }) => {
  // The notes sheet starts folded; open it.
  await page.addInitScript(() => localStorage.setItem("mr-notes-open", "true"));
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
});

// Protects against: the instructor's core flow breaking, or losing their work on reload
test("review an event and add a note, and both are still there after a reload", async ({ page }) => {
  await eventRow(page, /Missed alert: channel congestion/).click();
  await expect(slider(page)).toHaveValue("540");

  await page.getByRole("radio", { name: "Confirmed" }).check({ force: true });
  await expect(page.getByText("Review set to confirmed for 9:00.")).toBeVisible();

  await noteBox(page).fill("Operator was on the radio; discuss alert priority.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText("Note saved at 9:00.")).toBeVisible();
  await expect(page.getByText("Reviewed 1 of 6 events")).toBeVisible();

  await page.reload();
  // A reload reopens at the same moment, paused (the address remembers it), so the review is right where it was left.
  await expect(slider(page)).toHaveValue("540");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  const debrief = page.getByRole("region", { name: "Notes" });
  await expect(debrief.getByText("Operator was on the radio; discuss alert priority.")).toBeVisible();
  await expect(debrief.getByText("Reviewed 1 of 6 events")).toBeVisible();
  await expect(eventRow(page, /Missed alert: channel congestion/).locator("xpath=ancestor::li")).toContainText(
    "Confirmed",
  );
});

// Protects against: any step of reviewing, editing or deleting a note needing a mouse
test("the whole note flow works from the keyboard alone", async ({ page }) => {
  await page.getByRole("button", { name: "Add note" }).focus();
  await page.keyboard.press("Enter");
  await expect(noteBox(page)).toBeFocused();
  await page.keyboard.type("Typed without a mouse");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Save note" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Note saved at/)).toBeVisible();
  await expect(page.getByText("Typed without a mouse")).toBeVisible();

  // Edit, then delete with the two-step confirm, still keyboard only.
  await page.getByRole("button", { name: /Edit note at/ }).press("Enter");
  await expect(page.getByRole("textbox", { name: /Edit note at/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Delete note at/ }).press("Enter");
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Escape");
  await expect(page.getByText("Typed without a mouse")).toBeVisible();
});

// Protects against: a note's time changing while it's written during playback
test("a note's time is held while you write, even with playback running", async ({ page }) => {
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await noteBox(page).fill("Started at one moment");
  const held = (await page.getByText(/Note for/).textContent())!.match(/Note for (\d+:\d\d)/)![1];
  await page.waitForTimeout(1500); // the clock keeps moving
  await expect(page.getByText(/Note for/)).toContainText(`Note for ${held}`);
  await expect(page.getByText(/held, clock is at/)).toBeVisible();
});

// Protects against: the export not downloading, or missing the notes, reviews or disclaimer
test("exports the debrief as a Markdown file", async ({ page }) => {
  await eventRow(page, /Autonomy flagged an unusual vessel track/).click();
  await page.getByRole("radio", { name: "Adjusted" }).check({ force: true });
  await noteBox(page).fill("Autonomy was right; operator did not act.");
  await page.getByRole("button", { name: "Save note" }).click();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export Markdown" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("debrief-24-B.md");
  const text = await (await import("node:fs/promises")).readFile((await download.path())!, "utf8");
  expect(text).toContain("# Debrief: Exercise 24-B, Coastal Response Simulation");
  expect(text).toContain("### 12:20 · Autonomy flagged an unusual vessel track (Adjusted)");
  expect(text).toContain("> Autonomy was right; operator did not act.");
  expect(text).toContain("All data is fictional.");
});

// Protects against: the reported bug: the review control vanishing after clicking an event during playback
test("reviewing works while the clock is running: the event stays selected after you click it", async ({ page }) => {
  // No Pause here: this is the live case. beforeEach paused it, so start playing again.
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await eventRow(page, /Missed alert: channel congestion/).click();
  await page.waitForTimeout(1600); // the clock ticks well past 9:00

  await expect(page.getByText(/Note for/)).toContainText("9:00 · Missed alert: channel congestion");
  await expect(page.getByText(/held, clock is at/)).toBeVisible();

  // A real click on the radio, not a forced check, after the clock has moved on.
  await page.getByRole("radio", { name: "Confirmed" }).click();
  await expect(page.getByText("Review set to confirmed for 9:00.")).toBeVisible();
  await expect(page.getByText("Reviewed 1 of 6 events")).toBeVisible();

  await page.getByRole("button", { name: "Follow clock" }).click();
  await expect(page.getByText(/no event at this moment/)).toBeVisible();
});

// Protects against: the meaning of a review status being invisible to keyboard users, or drawn off screen or behind the sheet
test("arrowing through the review options shows what each means, inside the window", async ({ page }) => {
  await eventRow(page, /Missed alert: channel congestion/).click();
  await noteBox(page).focus();
  await page.keyboard.press("Shift+Tab"); // into the review options
  for (const [hint, key] of [
    ["Agree with how the system recorded this.", "ArrowRight"],
    ["Recorded, with a correction. Say what in a note.", "ArrowRight"],
    ["Not relevant to the debrief.", "ArrowRight"],
    ["Recorded, with a correction. Say what in a note.", "ArrowLeft"],
  ] as const) {
    await page.keyboard.press(key);
    const tip = page.locator('[aria-hidden="true"]', { hasText: hint });
    await expect(tip, `no hint shown for: ${hint}`).toBeVisible();
    const box = (await tip.boundingBox())!;
    const { width, height } = page.viewportSize()!;
    expect(box.x, "hint runs off the left").toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, "hint runs off the right").toBeLessThanOrEqual(width);
    expect(box.y, "hint runs off the top").toBeGreaterThanOrEqual(0);
    expect(box.y + box.height, "hint is below the window").toBeLessThanOrEqual(height);
  }
});
