import { expect, test, type Page } from "@playwright/test";

const choose = (page: Page, name: string) => page.getByRole("radio", { name }).check({ force: true });
const rgb = (r: number, g: number, b: number) => `rgb(${r}, ${g}, ${b})`;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
});

// Protects against: the reversed logo becoming unreadable on a light theme
test("the bar is a dark band in every theme, so the logo always reads", async ({ page }) => {
  const barColor = () =>
    page
      .locator(".bar")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  await choose(page, "Day"); // a light page, but the bar stays Ink
  await expect.poll(barColor).toBe(rgb(20, 20, 23));
  await choose(page, "Ops");
  await expect.poll(barColor).toBe(rgb(20, 20, 23));
  await choose(page, "Night");
  await expect.poll(barColor).toBe(rgb(0, 0, 0));
});

// Protects against: the logo not being tinted for Night, leaving a white or orange spot on a red-only screen
test("the logo keeps its brand colors in Day and Ops, and is tinted red in Night", async ({ page }) => {
  const fills = () =>
    page.getByRole("img", { name: "Logo placeholder" }).evaluate((svg) => {
      const f = [...svg.querySelectorAll("path")].map((p) => getComputedStyle(p).fill);
      return { mark: f[0], word: f[1] };
    });
  await choose(page, "Day");
  await expect.poll(fills).toEqual({ mark: rgb(240, 94, 43), word: rgb(255, 255, 255) });
  await choose(page, "Ops");
  await expect.poll(fills).toEqual({ mark: rgb(240, 94, 43), word: rgb(255, 255, 255) });
  await choose(page, "Night");
  await expect.poll(fills).toEqual({ mark: rgb(255, 45, 31), word: rgb(226, 42, 29) }); // no white, no orange
});

// Protects against: the popover appearing off-screen or misplaced, which the Night brightness filter can cause
test("the Display popover opens under its button, inside the screen, even in Night", async ({ page }) => {
  await choose(page, "Night");
  const trigger = page.getByRole("button", { name: "Display" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Display" });
  await expect(dialog).toBeVisible();
  const [t, d] = [await trigger.boundingBox(), await dialog.boundingBox()];
  const viewport = page.viewportSize()!;
  expect(d!.y).toBeGreaterThanOrEqual(t!.y + t!.height); // below the button
  expect(d!.x).toBeGreaterThanOrEqual(0);
  expect(d!.x + d!.width).toBeLessThanOrEqual(viewport.width);
  // Right-aligned to the button, not floating somewhere else (the Night filter must not skew it).
  expect(Math.abs(d!.x + d!.width - (t!.x + t!.width))).toBeLessThan(16);
});

// Protects against: keyboard users unable to open the popover, or losing focus on close
test("the Display popover works from the keyboard and returns focus", async ({ page }) => {
  await page.getByRole("button", { name: "Display" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Display" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Display" })).toBeFocused();
});
