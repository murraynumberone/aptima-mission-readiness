import { expect, test, type Page } from "@playwright/test";

const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);
const choose = (page: Page, name: string) => page.getByRole("radio", { name }).check({ force: true });
const openDisplay = async (page: Page) => {
  await page.getByRole("button", { name: "Display" }).click();
  await expect(page.getByRole("dialog", { name: "Display" })).toBeVisible();
};

// Protects against: System choosing the wrong theme, or Night appearing uninvited
test("System follows the OS: Day for light, Ops for dark, never Night", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  expect(await theme(page)).toBe("day");

  await page.emulateMedia({ colorScheme: "dark" }); // live OS change
  await expect.poll(() => theme(page)).toBe("ops");
});

const loads: { name: string; scheme: "light" | "dark"; stored: string | null; theme: string; bg: string }[] = [
  { name: "dark OS, nothing saved", scheme: "dark", stored: null, theme: "ops", bg: "rgb(20, 20, 23)" },
  { name: "light OS, nothing saved", scheme: "light", stored: null, theme: "day", bg: "rgb(245, 245, 245)" },
  { name: "light OS, Night saved", scheme: "light", stored: "night", theme: "night", bg: "rgb(0, 0, 0)" },
  { name: "dark OS, Day saved", scheme: "dark", stored: "day", theme: "day", bg: "rgb(245, 245, 245)" },
  { name: "dark OS, a corrupted saved value", scheme: "dark", stored: "neon", theme: "ops", bg: "rgb(20, 20, 23)" },
];
// Protects against: a flash of the wrong theme on load. Samples every painted frame, so it sees what a user sees,
// not just the final attribute.
for (const load of loads) {
  test(`no frame is painted in the wrong theme: ${load.name}`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: load.scheme });
    const page = await context.newPage();
    await page.addInitScript((stored) => {
      if (stored) localStorage.setItem("mr-theme", stored);
      const w = window as unknown as { frames: { theme: string; bg: string; content: boolean }[] };
      w.frames = [];
      const sample = () => {
        w.frames.push({
          theme: document.documentElement.dataset.theme ?? "none",
          bg: getComputedStyle(document.body ?? document.documentElement).backgroundColor,
          // Real content, not the loading placeholder that is drawn before the app mounts.
          content: !!document.querySelector("h1"),
        });
        if (w.frames.length < 45) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, load.stored);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Mission Readiness" })).toBeVisible();
    await page.waitForTimeout(500);
    const frames = await page.evaluate(
      () => (window as unknown as { frames: { theme: string; bg: string; content: boolean }[] }).frames,
    );

    expect(frames.length).toBeGreaterThan(5);
    expect(
      frames.filter((f) => f.theme !== load.theme),
      "a frame had the wrong theme",
    ).toEqual([]);
    // Once the app is on screen, its colors must already be final: no fade in from another theme.
    expect(
      frames.filter((f) => f.content && f.bg !== load.bg),
      "app content painted in the wrong colors",
    ).toEqual([]);
    await context.close();
  });
}

// Protects against: theme or brightness being forgotten on reload
test("an explicit choice, including Night and its brightness, survives a reload", async ({ page }) => {
  await page.goto("/");
  await choose(page, "Night");
  await openDisplay(page);
  await page.getByRole("slider", { name: "Night brightness" }).focus();
  await page.keyboard.press("Shift+ArrowLeft"); // 100 to 90
  await page.reload();
  expect(await theme(page)).toBe("night");
  await openDisplay(page);
  await expect(page.getByRole("slider", { name: "Night brightness" })).toHaveValue("90");
  await expect(page.locator("body")).toHaveCSS("filter", "brightness(0.9)");
});

// Protects against: a theme switch shifting content
test("switching themes never moves the layout", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const targets = [
    "header",
    "h1",
    "table",
    "[data-testid=scrubber]",
    "fieldset",
    "footer",
    "[aria-labelledby=events-heading]",
  ];
  const measure = () =>
    page.evaluate((sel) => {
      const boxes = sel.map((s) => {
        const r = document.querySelector(s)!.getBoundingClientRect();
        return [s, r.x, r.y + scrollY, r.width, r.height];
      });
      return { boxes, scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight };
    }, targets);

  await choose(page, "Day");
  const base = await measure();
  for (const name of ["Ops", "Night", "Day"]) {
    await choose(page, name);
    await page.waitForTimeout(350); // let the cross-fade finish
    expect(await measure(), `layout moved in ${name}`).toEqual(base);
  }
});

// Read class and duration in the same synchronous step: the fade class is removed after ~300 ms.
const afterSwitch = (page: Page, name: string) =>
  page
    .getByRole("radio", { name })
    .check({ force: true })
    .then(() =>
      page.evaluate(() => ({
        fading: document.documentElement.classList.contains("theme-transition"),
        duration: getComputedStyle(document.body).transitionDuration,
      })),
    );

// Protects against: the switch snapping instead of fading, or leaving a transition stuck on
test("colors cross-fade on switch, then the fade class is cleaned up", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const during = await afterSwitch(page, "Night");
  expect(during.fading).toBe(true);
  expect(during.duration.split(", ").every((d) => d === "0.25s")).toBe(true);
  await expect(page.locator("html")).not.toHaveClass(/theme-transition/);
});

// Protects against: the fade playing for people who asked for no motion
test("the swap is instant under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const during = await afterSwitch(page, "Night");
  expect(during.fading).toBe(false);
  expect(during.duration.split(", ").every((d) => d === "0s")).toBe(true);
  expect(await theme(page)).toBe("night");
});

// Protects against: dimming leaking into the other themes
test("brightness only dims Night", async ({ page }) => {
  await page.goto("/");
  await choose(page, "Night");
  await openDisplay(page);
  await page.getByRole("slider", { name: "Night brightness" }).focus();
  await page.keyboard.press("Home");
  await expect(page.locator("body")).toHaveCSS("filter", "brightness(0.4)");
  await choose(page, "Day");
  await expect(page.locator("body")).toHaveCSS("filter", "none");
  await expect(page.getByRole("slider", { name: "Night brightness" })).toBeDisabled();
});
