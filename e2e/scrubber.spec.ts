import { expect, test, type Page } from "@playwright/test";
import { spoken } from "./helpers";

const DURATION = 1800;

async function track(page: Page) {
  const box = await page.getByTestId("scrubber").boundingBox();
  if (!box) throw new Error("scrubber not laid out");
  const y = box.y + box.height / 2;
  return { y, x: (t: number) => box.x + (t / DURATION) * box.width };
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("slider", { name: "Exercise timeline" })).toBeVisible();
});

// Protects against: a drag that doesn't move the thumb, shows no time tooltip, or doesn't snap to a nearby event
test("dragging updates the time and shows a tooltip, and snaps to a nearby event marker", async ({ page }) => {
  const { x, y } = await track(page);
  const slider = page.getByRole("slider", { name: "Exercise timeline" });
  const tooltip = page.getByTestId("scrubber-tooltip");

  await page.mouse.move(x(400), y);
  await page.mouse.down();
  await expect(tooltip).toBeVisible();
  await expect(slider).toHaveValue(/^(39[5-9]|40\d)$/); // near 400, no marker within 15 s

  await page.mouse.move(x(548), y, { steps: 8 });
  await expect(slider).toHaveValue("540"); // snapped to the marker at 9:00
  await expect(tooltip).toContainText("9:00 · Missed alert: channel congestion");

  await page.mouse.move(x(600), y, { steps: 5 });
  await expect(slider).toHaveValue(/^(59[5-9]|60\d)$/); // outside the snap range, free again
  await page.mouse.up();
  await expect(tooltip).toBeHidden();
});

// Protects against: a drag that moves only the thumb and not the panels
test("every panel follows the drag", async ({ page }) => {
  const { x, y } = await track(page);
  await page.mouse.move(x(545), y);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.getByRole("slider", { name: "Exercise timeline" })).toHaveValue("540");
  await expect
    .poll(() => spoken(page.getByText("Alerts", { exact: true }).locator("xpath=following-sibling::dd[1]")))
    .toBe("1");
  await expect(page.getByText(/Latest event/)).toContainText("Missed alert: channel congestion");
});

// Protects against: dragging into time that hasn't happened
test("the thumb cannot be dragged into the part of the exercise that hasn't happened", async ({ page }) => {
  const { x, y } = await track(page);
  await page.mouse.move(x(300), y);
  await page.mouse.down();
  await page.mouse.move(x(1750), y, { steps: 10 });
  const value = Number(await page.getByRole("slider", { name: "Exercise timeline" }).inputValue());
  await page.mouse.up();
  expect(value).toBeGreaterThanOrEqual(1080);
  expect(value).toBeLessThan(1200); // the live edge, plus the few seconds the page has been open
});

// Protects against: the thumb fighting playback during a drag, or playback not resuming
test("playback pauses while dragging and resumes after release", async ({ page }) => {
  const { x, y } = await track(page);
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible(); // playing on load

  await page.mouse.move(x(400), y);
  await page.mouse.down();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
});

// Protects against: a drag starting playback the user had stopped
test("a paused scrubber stays paused after a drag", async ({ page }) => {
  const { x, y } = await track(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.mouse.move(x(400), y);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

// Protects against: keyboard users getting no focus indicator or time readout on the scrubber
test("keyboard focus shows the time tooltip and a visible focus ring", async ({ page }) => {
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("slider", { name: "Exercise timeline" }).focus();
  await page.keyboard.press("Tab"); // leave and return so focus-visible applies from the keyboard
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("slider", { name: "Exercise timeline" })).toBeFocused();
  await expect(page.getByTestId("scrubber-tooltip")).toBeVisible();
  const thumbOutline = await page
    .getByRole("slider", { name: "Exercise timeline" })
    .evaluate((input) => getComputedStyle(input.parentElement!).outlineStyle);
  expect(thumbOutline).toBe("solid");
});

// Protects against: markers that look clickable but aren't
test("event markers are clickable on the track", async ({ page }) => {
  await page.getByRole("button", { name: /Jump to 9:00/ }).click();
  await expect(page.getByRole("slider", { name: "Exercise timeline" })).toHaveValue("540");
});

// Protects against: the time tooltip hiding the playback buttons (a real layout bug we hit)
test("the drag tooltip doesn't cover the playback buttons", async ({ page }) => {
  const { x, y } = await track(page);
  await page.mouse.move(x(548), y);
  await page.mouse.down();
  const tip = await page.getByTestId("scrubber-tooltip").boundingBox();
  const buttons = await page.getByRole("button", { name: "Next event" }).boundingBox();
  await page.mouse.up();
  expect(tip!.y).toBeGreaterThanOrEqual(buttons!.y + buttons!.height);
});

// Protects against: the thumb sliding over the event icons. Real boxes are measured because jsdom has no layout.
test("the thumb never overlaps the event icons, wherever it is", async ({ page }) => {
  const thumb = page.getByRole("slider", { name: "Exercise timeline" }).locator("xpath=..");
  const icons = page.getByTestId("scrubber").locator("button svg");
  const { x, y } = await track(page);

  for (const t of [0, 300, 540, 740, 1000]) {
    await page.mouse.click(x(t), y);
    const thumbBox = (await thumb.boundingBox())!;
    for (const icon of await icons.all()) {
      const box = (await icon.boundingBox())!;
      expect(box.y + box.height, `icon overlaps the thumb at t=${t}`).toBeLessThanOrEqual(thumbBox.y - 4);
    }
  }
  expect(await icons.count()).toBeGreaterThan(3);
});

// Protects against: the time tooltip running off screen at 0:00, on the longest title, on a narrow screen, or with
// no room above. Measured on real boxes.
test("the time tooltip always stays fully on screen", async ({ page }) => {
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const tooltip = page.getByTestId("scrubber-tooltip");
  const moments = [0, 180, 740, 1080]; // far left, a short event, the longest event title, the live edge

  for (const width of [320, 640, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    for (const t of moments) {
      const { x, y } = await track(page);
      await page.mouse.move(x(t), y);
      await page.mouse.down();
      await expect(tooltip).toBeVisible();
      const box = (await tooltip.boundingBox())!;
      await page.mouse.up();
      expect(box.x, `left edge off screen at ${width}px, t=${t}`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `right edge off screen at ${width}px, t=${t}`).toBeLessThanOrEqual(width);
      expect(box.y, `top edge off screen at ${width}px, t=${t}`).toBeGreaterThanOrEqual(0);
    }
  }

  // No room above: scroll until the scrubber sits at the top of the window. The tooltip must move below it.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByTestId("scrubber").evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 4));
  const { x, y } = await track(page);
  await page.mouse.move(x(740), y);
  await page.mouse.down();
  await expect(tooltip).toBeVisible();
  const box = (await tooltip.boundingBox())!;
  await page.mouse.up();
  expect(box.y, "tooltip cut off at the top of the window").toBeGreaterThanOrEqual(0);
});
