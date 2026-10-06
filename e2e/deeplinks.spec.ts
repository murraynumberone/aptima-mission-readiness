import { expect, test, type Page } from "@playwright/test";

const slider = (page: Page) => page.getByRole("slider", { name: "Exercise timeline" });
const panel = (page: Page) => page.getByRole("region", { name: "Operator detail" });
const eventRow = (page: Page, label: RegExp) =>
  page.getByRole("region", { name: "Events" }).getByRole("button", { name: label });
const banner = (page: Page) => page.getByRole("region", { name: "Needs attention" });

// Protects against: a shared link opening somewhere other than the moment and operator that were shared
test("a shared link opens at that moment, with that operator's detail, paused", async ({ page }) => {
  await page.goto("/?t=540&op=op-03");
  await expect(slider(page)).toHaveValue("540");
  await expect(panel(page).getByRole("heading", { level: 3, name: "Operator 03" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.waitForTimeout(1200); // paused means paused: the moment must not drift
  await expect(slider(page)).toHaveValue("540");
});

// Protects against: a broken or tampered link taking the page down instead of opening normally
test("a malformed link opens normally", async ({ page }) => {
  await page.goto("/?t=banana&op=zzz&t2=%00");
  await expect(page.getByRole("heading", { name: "Mission Readiness" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible(); // playing from the live edge
  await expect(panel(page).getByText(/Select an operator/)).toBeVisible();
});

// Protects against: a copied link that does not reproduce the view when someone else opens it (a real clipboard
// and a second page)
test("a copied link reproduces the exact view in a fresh page", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await eventRow(page, /Autonomy flagged an unusual vessel track/).click(); // 12:20
  await page.getByRole("button", { name: /Why critical\? Operator 03/ }).click();
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(page.getByRole("button", { name: "Link copied", exact: true })).toBeVisible();

  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(link).searchParams.get("t")).toBe("740");

  const other = await context.newPage();
  await other.goto(link);
  await expect(slider(other)).toHaveValue("740");
  await expect(panel(other).getByRole("heading", { level: 3, name: "Operator 03" })).toBeVisible();
  await expect(panel(other).getByText(/below the 60% critical line/)).toBeVisible();
});

// Protects against: the attention banner and its button being below the fold at a normal laptop window
test("who needs attention is visible on load without scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await expect(banner(page).getByRole("button", { name: /Operator 03/ })).toBeInViewport({ ratio: 1 });
});

// Protects against: the banner changing height as operators come and go, pushing the page around while scrubbing
test("the attention banner keeps its height whoever is in it", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  for (const width of [1280, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const heights: number[] = [];
    for (const moment of [
      /Initial report received/,
      /Missed alert: channel congestion/,
      /Autonomy flagged an unusual vessel track/,
    ]) {
      await eventRow(page, moment).click(); // nobody, attention, critical
      heights.push((await banner(page).locator("> div").boundingBox())!.height);
    }
    expect(new Set(heights).size, `banner heights at ${width}px: ${heights}`).toBe(1);
  }
});

// Protects against: opening an operator from the banner and losing your place when closing it with the keyboard
test("opening from the banner and pressing Escape returns focus to the banner button", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await eventRow(page, /Missed alert: channel congestion/).click();
  const button = banner(page).getByRole("button", { name: /Operator 03/ });
  await button.click();
  await expect(panel(page).getByRole("heading", { level: 3, name: "Operator 03" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(button).toBeFocused();
});
