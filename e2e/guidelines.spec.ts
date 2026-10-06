import { expect, test, type Page } from "@playwright/test";

// Picks a theme and waits until it has really been applied, so nothing below can pass by comparing stale values.
const choose = async (page: Page, name: string) => {
  await page.getByRole("radio", { name }).check({ force: true });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(name.toLowerCase());
};
const eventRow = (page: Page, label: RegExp) =>
  page.getByRole("region", { name: "Events" }).getByRole("button", { name: label });

test.beforeEach(async ({ page }) => {
  // The notes sheet starts folded; open it.
  await page.addInitScript(() => localStorage.setItem("mr-notes-open", "true"));
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
});

// Protects against: keyboard and screen reader users tabbing through the whole bar to reach the content (WCAG
// 2.4.1). The skip link must be the first stop, visible when focused, and move focus.
test("the first Tab stop is a skip link that moves focus to the main content", async ({ page }) => {
  await page.reload(); // a fresh page, so Tab starts from the top
  await expect(page.getByRole("heading", { name: "Mission Readiness" })).toBeVisible(); // the app has mounted
  await page.keyboard.press("Tab");
  const link = page.getByRole("link", { name: "Skip to main content" });
  await expect(link).toBeFocused();
  const box = (await link.boundingBox())!;
  expect(box.y, "the skip link is off screen while focused").toBeGreaterThanOrEqual(0);
  expect(box.x).toBeGreaterThanOrEqual(0);

  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("main");
});

// Protects against: light scrollbars and form controls on a dark theme (the browser can't know the page is dark unless told)
test("the browser is told whether the theme is light or dark", async ({ page }) => {
  const scheme = () => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  for (const [theme, expected] of [
    ["Day", "light"],
    ["Ops", "dark"],
    ["Night", "dark"],
  ] as const) {
    await choose(page, theme);
    await expect.poll(scheme, { message: `color-scheme in ${theme}` }).toBe(expected);
  }
});

// Protects against: the browser's own bar (the address bar on a phone) not matching the app, which looks like a seam
test("the browser bar color follows the theme", async ({ page }) => {
  // Reduced motion makes the theme switch instant; otherwise the bar's color is mid-fade for 250 ms and a stale
  // theme-color can match it by coincidence.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const colors = () =>
    page.evaluate(() => {
      const hex = document.querySelector('meta[name="theme-color"]')!.getAttribute("content")!;
      const n = parseInt(hex.replace("#", ""), 16);
      return {
        meta: `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`,
        bar: getComputedStyle(document.querySelector(".bar")!).backgroundColor,
      };
    });
  for (const theme of ["Day", "Ops", "Night", "Day"]) {
    await choose(page, theme);
    await expect
      .poll(
        async () => {
          const { meta, bar } = await colors();
          return meta === bar;
        },
        { message: `theme-color after switching to ${theme}` },
      )
      .toBe(true);
  }
});

// Protects against: losing a half-written note to an accidental reload or closed tab, or being asked when there is
// nothing to lose. The page's "are you sure" hook is how browsers run the check.
test("leaving with an unsaved note asks first, and doesn't when there is nothing to lose", async ({
  page,
  browser,
}) => {
  await page.getByRole("textbox", { name: "Note", exact: true }).fill("Half a thought");
  let asked: string | undefined;
  page.on("dialog", (d) => {
    asked = d.type();
    void d.dismiss(); // stay on the page
  });
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => asked).toBe("beforeunload");

  const clean = await browser.newPage();
  await clean.goto("http://localhost:5173/");
  let askedClean = false;
  clean.on("dialog", (d) => {
    askedClean = true;
    void d.dismiss();
  });
  await clean.close({ runBeforeUnload: true });
  await expect.poll(() => clean.isClosed()).toBe(true); // it simply closed
  expect(askedClean).toBe(false);
});

// Protects against: a note with one very long unbroken word (a pasted link or ID) running off its panel. The
// text's real extent is measured, not the paragraph's box.
test("a very long unbroken word in a note wraps instead of running out of its panel", async ({ page }) => {
  await eventRow(page, /Missed alert: channel congestion/).click();
  await page.getByRole("textbox", { name: "Note", exact: true }).fill("https://example.test/" + "x".repeat(160));
  await page.getByRole("button", { name: "Save note" }).click();
  await page.setViewportSize({ width: 320, height: 800 });
  const { pageOver, textRight, panelRight } = await page.evaluate(() => {
    const note = [...document.querySelectorAll("li p")].find((p) => p.textContent?.includes("example.test"))!;
    const range = document.createRange();
    range.selectNodeContents(note);
    return {
      pageOver: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      textRight: range.getBoundingClientRect().right,
      panelRight: note.closest("ol")!.getBoundingClientRect().right,
    };
  });
  expect(pageOver, "the page scrolls sideways").toBeLessThanOrEqual(0);
  expect(textRight, "the text runs past the end of its panel").toBeLessThanOrEqual(panelRight + 0.5);
});
