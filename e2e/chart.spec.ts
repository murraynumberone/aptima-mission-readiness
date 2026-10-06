import { expect, test, type Page } from "@playwright/test";

const slider = (page: Page) => page.getByRole("slider", { name: "Exercise timeline" });
const hit = (page: Page) => page.getByTestId("chart-hit-area");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  // Centered, not just "into view": flush against the bottom of the window it would sit behind the docked notes bar.
  await hit(page).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect(hit(page)).toBeVisible();
});

// Protects against: clicking the chart doing nothing, landing on the wrong moment, or jumping into time that hasn't happened
test("clicking the chart jumps to that moment, and never past the live edge", async ({ page }) => {
  const box = (await hit(page).boundingBox())!;
  await page.mouse.click(box.x + box.width * (600 / 1800), box.y + box.height / 2);
  expect(Math.abs(Number(await slider(page).inputValue()) - 600)).toBeLessThanOrEqual(15);

  await page.mouse.click(box.x + box.width * 0.97, box.y + box.height / 2); // the hatched, not-yet-happened part
  const value = Number(await slider(page).inputValue());
  expect(value).toBeGreaterThanOrEqual(1080);
  expect(value).toBeLessThan(1130); // the live edge, plus the seconds the page has been open
});

// Protects against: the chart only reacting to a click, so exploring the exercise means clicking again and again
test("dragging across the chart follows the pointer, and stops at the live edge", async ({ page }) => {
  const box = (await hit(page).boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * (300 / 1800), y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * (900 / 1800), y, { steps: 8 });
  expect(
    Math.abs(Number(await slider(page).inputValue()) - 900),
    "the moment lagged behind the pointer",
  ).toBeLessThanOrEqual(15);
  await page.mouse.move(box.x + box.width * (600 / 1800), y, { steps: 4 });
  expect(Math.abs(Number(await slider(page).inputValue()) - 600), "dragging back did not follow").toBeLessThanOrEqual(
    15,
  );
  await page.mouse.move(box.x + box.width + 120, y, { steps: 4 }); // well outside the chart
  const atEdge = Number(await slider(page).inputValue());
  expect(atEdge, "stopped following once the pointer left the chart").toBeGreaterThanOrEqual(1080);
  expect(atEdge, "went past the live edge").toBeLessThan(1130);
  await page.mouse.move(box.x - 60, y, { steps: 6 }); // off the left side, where outside means the very start
  expect(
    Number(await slider(page).inputValue()),
    "stopped following once the pointer left the chart",
  ).toBeLessThanOrEqual(5);
  await page.mouse.up();
});

// Protects against: playback fighting the drag, or a drag leaving playback stopped for someone who was watching it run
test("playback pauses while dragging the chart and resumes after, if it was playing", async ({ page }) => {
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await hit(page).evaluate((el) => el.scrollIntoView({ block: "center" })); // clicking Play scrolled the page
  const box = (await hit(page).boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * (300 / 1800), y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * (400 / 1800), y, { steps: 4 });
  const during = Number(await slider(page).inputValue());
  await page.waitForTimeout(1500); // longer than the whole second the slider shows
  expect(Number(await slider(page).inputValue()), "the clock kept running under the pointer").toBe(during);
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
});

// Protects against: the table toggle looking like only its words are clickable, when the whole row is
test("the whole 'View as a table' row highlights on hover, not only its words", async ({ page }) => {
  const summary = page.getByText("View as a table");
  await summary.scrollIntoViewIfNeeded();
  const box = (await summary.boundingBox())!;
  const background = () => summary.evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.mouse.move(box.x + 2, box.y - 40); // away from it
  const idle = await background();
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2); // far right of the words
  expect(await background(), "no hover feedback away from the words").not.toBe(idle);
  expect(await summary.evaluate((el) => getComputedStyle(el).cursor)).toBe("pointer");
  expect(await summary.evaluate((el) => getComputedStyle(el).userSelect), "text can show a text cursor").toBe("none");
});

// Protects against: the chart's cursor drifting away from the moment the rest of the app is showing
test("the cursor sits exactly where the scrubber and every other panel are", async ({ page }) => {
  const box = (await hit(page).boundingBox())!;
  for (const t of [180, 540, 740]) {
    await page
      .getByRole("region", { name: "Events" })
      .getByRole("button", { name: new RegExp(`^\\s*${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`) })
      .click();
    const cursor = (await page.getByTestId("chart-cursor").boundingBox())!;
    const expected = box.x + box.width * (t / 1800);
    expect(Math.abs(cursor.x - expected), `cursor at t=${t}`).toBeLessThanOrEqual(1.5);
  }
});

// Protects against: the lines running on into the part of the exercise that hasn't happened
test("the lines stop at the live edge", async ({ page }) => {
  const box = (await hit(page).boundingBox())!;
  const edgeX = box.x + box.width * (1080 / 1800);
  for (const id of ["line-readiness", "line-score"]) {
    const line = (await page.getByTestId(id).boundingBox())!;
    expect(line.x + line.width, `${id} runs past the live edge`).toBeLessThanOrEqual(edgeX + 40); // a few seconds of playback before pausing
    expect(line.x + line.width).toBeGreaterThan(edgeX - 5);
  }
});

// Protects against: two series that look the same without color, in a real renderer (not just in attributes)
test("the two lines are drawn differently, solid and dashed", async ({ page }) => {
  const dash = (id: string) => page.getByTestId(id).evaluate((el) => getComputedStyle(el).strokeDasharray);
  expect(await dash("line-readiness")).toBe("none");
  expect(await dash("line-score")).not.toBe("none");
});
