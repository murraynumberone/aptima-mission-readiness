import { expect, test, type Page } from "@playwright/test";

const open03 = (page: Page) => page.getByRole("button", { name: "Why attention? Operator 03" }).click();
const panel = (page: Page) => page.getByRole("region", { name: "Operator detail" });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click(); // stable numbers
});

// Protects against: the panel pushing the table around when it opens, or not sitting beside it
test("on a wide screen the panel sits beside the table, and opening it doesn't move the table", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const table = page.getByRole("table", { name: /Operators in Team/ });
  // Position within the page, not the window: opening the panel may scroll, which is not a layout change.
  const inPage = () =>
    table.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height };
    });
  const before = await inPage();
  await open03(page);
  const after = await inPage();
  const p = await panel(page).boundingBox();
  expect(after).toEqual(before);
  expect(p!.x).toBeGreaterThanOrEqual(after.x + after.width);
  await expect(panel(page).getByRole("heading", { level: 3, name: "Operator 03" })).toBeFocused();
});

// Protects against: the panel overlapping the table on small screens
test("on a narrow screen the panel stacks below the table", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await open03(page);
  const t = await page.getByRole("table", { name: /Operators in Team/ }).boundingBox();
  const p = await panel(page).boundingBox();
  expect(p!.y).toBeGreaterThanOrEqual(t!.y + t!.height);
});

// Protects against: the Why panel and the timeline disagreeing after a jump
test("a cause jumps the timeline and the explanation updates", async ({ page }) => {
  await open03(page);
  await expect(panel(page).getByText(/below the 72% attention line/)).toBeVisible();
  await panel(page)
    .getByRole("button", { name: /Show 12:20 on the timeline/ })
    .click();
  await expect(page.getByRole("slider", { name: "Exercise timeline" })).toHaveValue("740");
  await expect(panel(page).getByText(/below the 60% critical line/)).toBeVisible();
});

// Protects against: closing the panel with Escape stranding keyboard users
test("closing returns focus to the row button", async ({ page }) => {
  await open03(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Why (attention|critical)\? Operator 03/ })).toBeFocused();
});
