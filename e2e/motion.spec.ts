import { expect, test, type Page } from "@playwright/test";

// Names of the animations the browser is actually running right now.
const running = (page: Page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === "running")
      .map((a) => (a as CSSAnimation).animationName)
      .filter(Boolean),
  );
const eventRow = (page: Page, label: RegExp) =>
  page.getByRole("region", { name: "Events" }).getByRole("button", { name: label });

// Protects against: motion playing for people who asked for none (WCAG 2.3.3). Loads the busiest moment: a pulsing
// alert, the blinking cursor, and entrance animations.
test("nothing animates when the user asks for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await eventRow(page, /Missed alert: channel congestion/).click(); // 9:00, an alert is active
  await page.waitForTimeout(300);
  expect(await running(page)).toEqual([]);
});

// Protects against: the animations quietly not existing at all, which would make the reduced-motion test above pass for the wrong reason
test("the entrance animations do play on load for everyone else", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect.poll(() => running(page)).toEqual(expect.arrayContaining(["reveal", "draw", "blink"]));
});

// Protects against: entrance animations replaying every time you scrub, which would make the page flicker under your hands
test("rows and lines draw in once, not again when you move around", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect.poll(async () => (await running(page)).filter((n) => n === "reveal" || n === "draw")).toEqual([]); // finished
  await eventRow(page, /Missed alert: channel congestion/).click();
  await eventRow(page, /Initial report received/).click();
  await page.waitForTimeout(200);
  expect((await running(page)).filter((n) => n === "reveal" || n === "draw")).toEqual([]);
});

// Protects against: a blinking cursor that never stops (WCAG 2.2.2), or one that ignores the person trying to use the page
test("the cursor stops blinking as soon as you touch the page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect.poll(() => running(page)).toContain("blink");
  await page.getByRole("heading", { name: "Mission Readiness" }).click();
  await expect.poll(() => running(page)).not.toContain("blink");
  await expect(page.getByTestId("status-cursor")).toBeVisible(); // it stays, steady, like a terminal at rest
});

// Protects against: a blinking cursor that runs forever when the person never touches the page (WCAG 2.2.2)
test("the cursor stops blinking by itself after a few seconds", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.goto("/");
  await expect.poll(() => running(page)).toContain("blink");
  await page.clock.fastForward(7000);
  await expect.poll(() => running(page)).not.toContain("blink");
});

// Protects against: the alert pulse running when nothing is active (crying wolf), or never running when something is
test("the alert pulses only while an alert is active", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await eventRow(page, /Missed alert: channel congestion/).click(); // 9:00: just happened
  await expect(page.getByText("Active now: 1 in the last 90 s")).toBeVisible();
  await expect.poll(() => running(page)).toContain("pulse");
  // Finite, not endless: two pulses, then a steady dot. Motion past 5 s with no way to stop it fails WCAG 2.2.2.
  const iterations = await page.evaluate(
    () =>
      document
        .getAnimations()
        .find((a) => (a as CSSAnimation).animationName === "pulse")!
        .effect!.getTiming().iterations,
  );
  expect(iterations).toBe(2);

  await eventRow(page, /Autonomy flagged an unusual vessel track/).click(); // 12:20: that is a new alert
  await eventRow(page, /Track monitoring returned to Operator 01/).click(); // 14:00: 100 s on, nothing active
  await expect(page.getByText("None in the last 90 s")).toBeVisible();
  await expect.poll(() => running(page)).not.toContain("pulse");
});

// Samples the visible digits on every frame after a jump that changes Alerts from 3 to 1.
const sampleDigits = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const card = [...document.querySelectorAll("dt")].find((d) => d.textContent === "Alerts")!.parentElement!;
        const seen: string[] = [];
        const start = performance.now();
        const frame = () => {
          seen.push(card.querySelector('[aria-hidden="true"]')!.textContent ?? "");
          if (performance.now() - start < 700) requestAnimationFrame(frame);
          else resolve(seen);
        };
        requestAnimationFrame(frame);
      }),
  );

// Protects against: numbers jumping when they change, which is hard to follow while scrubbing
test("a number counts through the values in between when it changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const sampling = sampleDigits(page);
  await eventRow(page, /Missed alert: channel congestion/).click(); // Alerts: 3 -> 1
  const seen = await sampling;
  expect(seen).toContain("2"); // it passed through the value between
  expect(seen.at(-1)).toBe("1"); // and landed on the real one
});

// Protects against: numbers counting for someone who asked for reduced motion
test("a number jumps straight to its new value for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const sampling = sampleDigits(page);
  await eventRow(page, /Missed alert: channel congestion/).click();
  const seen = await sampling;
  expect(seen).not.toContain("2");
  expect(seen.at(-1)).toBe("1");
});

// Protects against: a loading placeholder that is unstyled (a white page with "Loading" text showing). With the
// script held back it must already be styled, shaped like the page, animating, and announced without visible text.
test("the loading placeholder is already styled and shaped like the page before the app loads", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route(/\/(src\/main\.tsx|assets\/index-[^/]+\.js)(\?.*)?$/, async (route) => {
    await gate;
    await route.continue();
  });

  await page.goto("/", { waitUntil: "commit" });
  const skeleton = page.getByTestId("app-shell-skeleton");
  await expect(skeleton).toBeAttached();
  await expect(page.getByRole("heading", { name: "Mission Readiness" })).toHaveCount(0);

  // Styled: a stylesheet is loaded, and the placeholder fills the screen instead of collapsing to one line of text.
  await expect.poll(() => page.evaluate(() => document.styleSheets.length)).toBeGreaterThan(0);
  await expect.poll(async () => (await skeleton.boundingBox())?.height ?? 0).toBeGreaterThan(400);

  // Shimmering, so it reads as "loading" and not as a broken page.
  await expect.poll(() => running(page)).toContain("shimmer");

  // Announced, but the words themselves are not drawn on the page.
  const status = skeleton.getByRole("status");
  await expect(status).toHaveText("Loading Mission Readiness…");
  const box = (await status.boundingBox())!;
  expect(box.width, "the status text is visible on the page").toBeLessThanOrEqual(2);
  expect(box.height, "the status text is visible on the page").toBeLessThanOrEqual(2);

  release();
  await expect(page.getByRole("heading", { name: "Mission Readiness" })).toBeVisible();
  await expect(skeleton).toHaveCount(0); // React replaced it, nothing left behind
});

// Counts every running animation, including ones with no name (Motion's element animations have none).
const runningCount = (page: Page) =>
  page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);

// Protects against: an icon change that does not animate, or that animates for people who asked for no motion.
// Toggling Play and Pause is the state change.
test("the play and pause icon animates when it changes, and doesn't under reduced motion", async ({ browser }) => {
  for (const [reduced, expectMotion] of [
    ["no-preference", true],
    ["reduce", false],
  ] as const) {
    const context = await browser.newContext({ reducedMotion: reduced });
    const page = await context.newPage();
    await page.goto("/");
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await eventRow(page, /Initial report received/).click(); // paused at a moment with no active alert, so nothing pulses
    await page.getByRole("heading", { name: "Mission Readiness" }).click(); // stops the cursor blinking
    await expect.poll(() => runningCount(page)).toBe(0); // lets the entrance animations finish
    expect(await runningCount(page), "something is still moving before the click").toBe(0);

    await page.getByRole("button", { name: "Play", exact: true }).click();
    const during = await page.evaluate(
      () =>
        new Promise<number>((resolve) =>
          requestAnimationFrame(() =>
            resolve(document.getAnimations().filter((a) => a.playState === "running").length),
          ),
        ),
    );
    if (expectMotion) expect(during, "the icon swap did not animate").toBeGreaterThan(0);
    else expect(during, "the icon swap animated under reduced motion").toBe(0);
    await context.close();
  }
});

// Protects against: the confirmation tick ending half drawn or invisible. Its draw-in starts with the stroke
// hidden, so interrupting it could leave it that way.
test("the copy confirmation always ends as a fully drawn check, with or without motion", async ({ browser }) => {
  for (const reduced of ["no-preference", "reduce"] as const) {
    const context = await browser.newContext({ reducedMotion: reduced });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const page = await context.newPage();
    await page.goto("http://localhost:5173/?t=540");
    await page.getByRole("button", { name: "Copy link", exact: true }).click();
    const copied = page.getByRole("button", { name: "Link copied", exact: true });
    await expect(copied).toBeVisible();
    await page.waitForTimeout(500); // longer than the draw-in
    const drawn = await copied
      .locator("svg path")
      .first()
      .evaluate((path) => {
        const style = getComputedStyle(path);
        const dashed = style.strokeDasharray !== "none";
        return { hidden: dashed && parseFloat(style.strokeDashoffset) > 0.001 };
      });
    expect(drawn.hidden, `the tick is not fully drawn (${reduced})`).toBe(false);
    await context.close();
  }
});
