import { expect, test, type Page } from "@playwright/test";

const OPEN = () => localStorage.setItem("mr-notes-open", "true");
const sheet = (page: Page) => page.getByRole("region", { name: "Notes" });

// Protects against: "Add note" scrolling the timeline and chart off screen while you write about them
test("Add note opens the sheet where you are, without scrolling the timeline away", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?t=540");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Note", exact: true })).toBeFocused();
  const after = await page.evaluate(() => {
    const r = document.querySelector('[data-testid="scrubber"]')!.getBoundingClientRect();
    return { scrollY: Math.round(scrollY), scrubberVisible: r.top >= 0 && r.bottom <= innerHeight };
  });
  expect(after.scrollY, "the page scrolled").toBeLessThanOrEqual(5);
  expect(after.scrubberVisible, "the timeline left the screen").toBe(true);
});

// Protects against: the sheet sliding off with the page instead of staying put, which would bring back the scrolling
test("the sheet stays docked to the bottom of the window as the page scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?t=540");
  const bottomGap = () => sheet(page).evaluate((el) => Math.round(innerHeight - el.getBoundingClientRect().bottom));
  expect(await bottomGap()).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 500));
  expect(await bottomGap()).toBe(0);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); // the very end: it is just part of the page
  expect(await bottomGap()).toBeGreaterThanOrEqual(0);
});

// Protects against: a control you tab to landing underneath the floating sheet (WCAG 2.4.11 Focus Not Obscured).
// Tabs through the whole page with the sheet open.
test("tabbing through the page never lands behind the open sheet", async ({ page }) => {
  await page.addInitScript(OPEN);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?t=540");
  await expect(page.getByRole("heading", { name: "Mission Readiness" })).toBeVisible();

  const covered: string[] = [];
  const behindSheet = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      const s = document.querySelector('section[aria-label="Notes"]');
      if (!el || el === document.body || !s || s.contains(el)) return null;
      const a = el.getBoundingClientRect();
      const b = s.getBoundingClientRect();
      const overlaps = a.bottom > b.top + 1 && a.top < b.bottom && a.right > b.left && a.left < b.right;
      return overlaps
        ? `${el.tagName} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}"`
        : null;
    });
  // Forward through the page into the sheet, then back out: focus leaving the sheet upward is a different path
  // from arriving from above, and both must stay clear.
  for (const key of ["Tab", "Shift+Tab"]) {
    for (let i = 0; i < 110; i++) {
      await page.keyboard.press(key);
      const hit = await behindSheet();
      if (hit) covered.push(`${key}: ${hit}`);
    }
  }
  expect(covered, "focused controls hidden behind the sheet").toEqual([]);
});

// Protects against: a floating sheet taking over a short window or a heavily zoomed page (WCAG 1.4.10 reflow)
test("on a short window it sits in the page instead of floating over it", async ({ page }) => {
  await page.addInitScript(OPEN);
  await page.goto("/?t=540");
  await page.setViewportSize({ width: 1280, height: 480 });
  expect(await sheet(page).evaluate((el) => getComputedStyle(el).position)).toBe("static");
  await page.setViewportSize({ width: 1280, height: 800 });
  expect(await sheet(page).evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
});

// Protects against: the sheet spreading across the operator panel, hiding the "Why" you are writing about
test("the sheet leaves the operator panel on the right uncovered", async ({ page }) => {
  await page.addInitScript(OPEN);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?t=540&op=op-03");
  const [s, p] = [
    await sheet(page).boundingBox(),
    await page.getByRole("region", { name: "Operator detail" }).boundingBox(),
  ];
  expect(s!.x + s!.width, "the sheet runs under the operator panel").toBeLessThanOrEqual(p!.x + 1);
});

// Protects against: review status labels being cut off because the control chose its layout from the window width
// inside a narrow column. The text's real extent is measured against its cell.
test("the review status labels are never cut off, at any window width", async ({ page }) => {
  await page.addInitScript(OPEN);
  const clipped: string[] = [];
  for (const width of [1440, 1280, 1024, 768, 600, 400, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?t=540"); // on an event, so the review control is showing
    await expect(page.getByRole("group", { name: "Review status" })).toBeVisible();
    const result = await page.getByRole("group", { name: "Review status" }).evaluate((group) =>
      [...group.querySelectorAll("label > span")].flatMap((cell) => {
        const range = document.createRange();
        range.selectNodeContents(cell);
        const text = range.getBoundingClientRect();
        const box = cell.getBoundingClientRect();
        const cut = text.left < box.left - 0.5 || text.right > box.right + 0.5;
        return cut ? [cell.textContent!.trim()] : [];
      }),
    );
    if (result.length) clipped.push(`${width}px: ${result.join(", ")}`);
  }
  expect(clipped, "labels running past their cells").toEqual([]);
});

// Protects against: the page behind the sheet scrolling on every keystroke, and on every click on Edit or Delete
test("using the sheet never moves the page behind it", async ({ page }) => {
  await page.addInitScript(OPEN);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?t=540");
  await page.evaluate(() => window.scrollTo(0, 300));
  const scrollY = () => page.evaluate(() => Math.round(window.scrollY));
  const start = await scrollY();
  const moved: string[] = [];
  const check = async (what: string) => {
    const now = await scrollY();
    if (now !== start) moved.push(`${what}: ${start} -> ${now}`);
  };

  const box = page.getByRole("textbox", { name: "Note", exact: true });
  await box.click();
  await check("clicking into the note box");
  for (const ch of "Typing a note, one key at a time") {
    await page.keyboard.type(ch);
  }
  await check("typing");
  await page.getByRole("button", { name: "Save note" }).click();
  await check("saving");

  await page.getByRole("button", { name: /Edit note at 9:00/ }).click();
  await check("clicking Edit");
  await page.keyboard.type(" and more");
  await check("typing while editing");
  await page.keyboard.press("Escape");
  await check("cancelling the edit");

  await page.getByRole("button", { name: /Delete note at 9:00/ }).click();
  await check("clicking Delete");
  await page.getByRole("button", { name: "Cancel" }).click();
  await check("cancelling the delete");

  expect(moved, "the page behind the sheet moved").toEqual([]);
});

// Protects against: the open sheet taking over the screen. It must leave enough of the timeline, chart and table
// to look at while writing.
test("the open sheet takes no more than 45% of the window", async ({ page }) => {
  await page.addInitScript(OPEN);
  const tooTall: string[] = [];
  for (const [width, height] of [
    [1280, 720],
    [1440, 900],
    [1024, 768],
    [1280, 640],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/?t=540"); // on an event: the tallest the composer gets (it shows the review control)
    const share = await sheet(page).evaluate((el) => el.getBoundingClientRect().height / innerHeight);
    if (share > 0.45) tooTall.push(`${width}x${height}: ${(share * 100).toFixed(0)}%`);
  }
  expect(tooTall, "the sheet is too tall").toEqual([]);
});

// Protects against: the sheet resizing as you type, save, edit or delete. Its height depends on the window, never
// on what is inside.
test("the sheet keeps exactly the same height while it is used", async ({ page }) => {
  await page.addInitScript(OPEN);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?t=540");
  const heights: Record<string, number> = {};
  const note = async (step: string) => (heights[step] = (await sheet(page).boundingBox())!.height);

  await note("empty");
  const box = page.getByRole("textbox", { name: "Note", exact: true });
  await box.fill(
    "A first note that is long enough to wrap onto a second line when it is saved into the list on the right",
  );
  await note("typing");
  await page.getByRole("button", { name: "Save note" }).click();
  await note("saved");
  await page.getByRole("button", { name: /Edit note at 9:00/ }).click();
  await note("editing");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Delete note at 9:00/ }).click();
  await note("confirming a delete");
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("radio", { name: "Adjusted" }).check({ force: true });
  await note("reviewing");

  expect(new Set(Object.values(heights)).size, `sheet heights by step: ${JSON.stringify(heights)}`).toBe(1);
});

// Protects against: the sheet snapping open and shut with no slide, or sliding for someone who asked for reduced
// motion. The panel height is sampled on every frame.
test("the sheet slides open and shut, and jumps for reduced motion", async ({ browser }) => {
  for (const [reduced, slides] of [
    ["no-preference", true],
    ["reduce", false],
  ] as const) {
    const context = await browser.newContext({ reducedMotion: reduced, viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    await page.goto("http://localhost:5173/?t=540");
    await page.waitForTimeout(500);

    const sampleDuring = (action: () => Promise<unknown>) =>
      Promise.all([
        page.evaluate(
          () =>
            new Promise<number[]>((resolve) => {
              const panel = document.querySelector('section[aria-label="Notes"] [data-testid="notes-panel"]')!;
              const seen: number[] = [];
              const start = performance.now();
              const frame = () => {
                seen.push(Math.round(panel.getBoundingClientRect().height));
                if (performance.now() - start < 500) requestAnimationFrame(frame);
                else resolve(seen);
              };
              requestAnimationFrame(frame);
            }),
        ),
        action(),
      ]).then(([seen]) => seen);

    const opening = await sampleDuring(() => page.getByRole("button", { name: /^Notes/ }).click());
    const full = Math.max(...opening);
    expect(full, "the panel never opened").toBeGreaterThan(100);
    const between = (seen: number[]) => seen.filter((h) => h > 2 && h < full - 2);
    if (slides) expect(between(opening).length, "opening did not slide").toBeGreaterThan(0);
    else expect(between(opening), "opening slid under reduced motion").toEqual([]);

    const closing = await sampleDuring(() => page.getByRole("button", { name: /^Notes/ }).click());
    if (slides) expect(between(closing).length, "closing did not slide").toBeGreaterThan(0);
    else expect(between(closing), "closing slid under reduced motion").toEqual([]);
    await context.close();
  }
});

// Protects against: clicking empty space flinging the page to the bottom. <main> is focusable and very tall, so it
// must never be treated as a control hidden behind the sheet.
test("clicking empty space on the page doesn't scroll it", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/?t=540");
  await page.evaluate(() => window.scrollTo(0, 200));
  const before = await page.evaluate(() => Math.round(scrollY));
  // A gap between sections: plain page background inside <main>, which takes focus when clicked.
  const gap = await page.evaluate(() => {
    const a = document.querySelector('[aria-labelledby="attention-heading"]')!.getBoundingClientRect();
    return { x: Math.round(innerWidth / 2), y: Math.round(a.top - 8) }; // inside <main>, in the margin above the banner
  });
  await page.mouse.click(gap.x, gap.y);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => Math.round(scrollY)), "the page scrolled after clicking empty space").toBe(before);
});

// Protects against: a long note being clipped by the sheet with no way to reach its Edit and Delete buttons
test("a long note can still be edited and deleted", async ({ page }) => {
  await page.addInitScript(OPEN);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?t=540");
  const long = Array.from({ length: 40 }, (_, i) => `line ${i} of a long note`).join(" ");
  await page.getByRole("textbox", { name: "Note", exact: true }).fill(long);
  await page.getByRole("button", { name: "Save note" }).click();
  const edit = page.getByRole("button", { name: /^Edit/ });
  const scrollLikeAUser = async (button: ReturnType<typeof page.getByRole>) => {
    const note = await page.getByRole("list").filter({ hasText: "line 0" }).boundingBox();
    await page.mouse.move(note!.x + 20, note!.y + 20);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 200); // the wheel, not a script, which can scroll clipped boxes
    await page.waitForTimeout(100);
    await expect(button).toBeInViewport({ ratio: 1 });
  };
  await scrollLikeAUser(edit);
  const inView = await edit.evaluate((el) => {
    const panel = el.closest('[data-testid="notes-panel"]')!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return r.top >= panel.top && r.bottom <= panel.bottom;
  });
  expect(inView, "Edit is cut off and can't be scrolled to").toBe(true);
  await edit.click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await scrollLikeAUser(page.getByRole("button", { name: /^Delete/ }));
  await page.getByRole("button", { name: /^Delete/ }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByText("No notes yet.")).toBeVisible();
});
