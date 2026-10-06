import { expect, test } from "@playwright/test";

// Protects against: fonts missing, not applied, or fetched from another origin (a privacy requirement)
test("fonts are self-hosted and actually applied", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) external.push(r.url());
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const used = await page.evaluate(() => ({
    next: document.fonts.check('14px "Atkinson Hyperlegible Next Variable"'),
    mono: document.fonts.check('12px "Atkinson Hyperlegible Mono Variable"'),
    loaded: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")),
    body: getComputedStyle(document.body).fontFamily,
    h1: getComputedStyle(document.querySelector("h1")!).fontFamily,
    label: getComputedStyle(document.querySelector("th")!).fontFamily,
    h1Weight: getComputedStyle(document.querySelector("h1")!).fontWeight,
  }));
  expect(used.loaded).toContain("Atkinson Hyperlegible Next Variable");
  expect(used.loaded).toContain("Atkinson Hyperlegible Mono Variable");
  expect(used.body).toContain("Atkinson Hyperlegible Next");
  expect(used.h1).toContain("Atkinson Hyperlegible Next");
  expect(used.label).toContain("Atkinson Hyperlegible Mono");
  expect(used.h1Weight).toBe("600");
  expect(external, "no request may leave this origin").toEqual([]);
});

// Protects against: text clipped or the page overflowing when users change text spacing (WCAG 1.4.12)
test("dense layout survives the WCAG 1.4.12 text spacing overrides", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.addStyleTag({
    content: `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
              p { margin-bottom: 2em !important; }`,
  });
  for (const width of [1280, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const result = await page.evaluate(() => ({
      pageScrolls: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      // Text that no longer fits its own box would be clipped.
      clipped: [...document.querySelectorAll<HTMLElement>("button, th, td, dt, dd, label, legend")]
        .filter(
          (el) =>
            !el.classList.contains("sr-only") &&
            getComputedStyle(el).overflow !== "visible" &&
            el.scrollWidth > el.clientWidth + 1,
        )
        .map((el) => el.textContent?.trim().slice(0, 30)),
    }));
    expect(result.pageScrolls, `page scrolls sideways at ${width}px`).toBe(false);
    expect(result.clipped).toEqual([]);
  }
});

// Protects against: the event list's misaligned columns and half-highlighted rows (a bug we hit)
test("event rows line up and highlight as one row", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const row = page.getByRole("listitem").filter({ hasText: "Missed alert: channel congestion" }).first();
  await row.scrollIntoViewIfNeeded();
  const title = row.locator("button span");
  const time = row.locator("time");
  const detail = row.locator("p");

  const [t, tm, d, r] = await Promise.all([
    title.boundingBox(),
    time.boundingBox(),
    detail.boundingBox(),
    row.boundingBox(),
  ]);
  expect(d!.x, "detail starts exactly where the title starts").toBeCloseTo(t!.x, 0);
  expect(Math.abs(tm!.y + tm!.height / 2 - (t!.y + t!.height / 2)), "time and title share a line").toBeLessThan(4);
  expect(d!.y).toBeGreaterThan(t!.y + t!.height - 1); // detail sits below the title

  // Hovering either line highlights the same, full-height row.
  const bg = () => row.evaluate((el) => getComputedStyle(el).backgroundColor);
  const rest = await bg();
  // The row is one stretched click target, so move the real mouse instead of hover()'s actionability check.
  await page.mouse.move(d!.x + d!.width / 2, d!.y + d!.height / 2);
  const onDetail = await bg();
  await page.mouse.move(t!.x + t!.width / 2, t!.y + t!.height / 2);
  const onTitle = await bg();
  expect(onDetail).not.toBe(rest);
  expect(onTitle).toBe(onDetail);
  expect(r!.height).toBeGreaterThan(t!.height + d!.height); // padding is inside the highlighted row
});

// Protects against: sideways scrolling at 320 px (WCAG 1.4.10). Visits the busiest state once instead of several.
test("nothing makes the page scroll sideways at 320 px, with every panel open", async ({ page }) => {
  // The notes sheet starts folded; open it.
  await page.addInitScript(() => localStorage.setItem("mr-notes-open", "true"));
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Why attention? Operator 03" }).click();
  await page
    .getByRole("region", { name: "Events" })
    .getByRole("button", { name: /Missed alert: channel congestion/ })
    .click();
  await page.getByRole("radio", { name: "Dismissed" }).check({ force: true });
  await page
    .getByRole("textbox", { name: "Note", exact: true })
    .fill("A fairly long note that has to wrap rather than push the page wider than a small screen.");
  await page.getByRole("button", { name: "Save note" }).click();
  await page.setViewportSize({ width: 320, height: 800 });

  const overflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: "Display" }).click();
  await expect(page.getByRole("dialog", { name: "Display" })).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);
  await expect(page.getByRole("img", { name: "Aptima" })).toBeVisible();
});

// Protects against: the playback buttons shifting sideways when Play becomes Pause. Reads positions before and
// after, since a width change only shows in real layout.
test("swapping Play and Pause never moves the controls beside it", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready); // font loading changes widths; measure only once it's done
  const toolbar = page.getByRole("region", { name: "Playback" }).locator("button");
  const boxes = () =>
    toolbar.evaluateAll((buttons) =>
      buttons.slice(0, 5).map((b) => {
        const r = b.getBoundingClientRect();
        return `${Math.round(r.x * 10) / 10}:${Math.round(r.width * 10) / 10}`;
      }),
    );

  expect(await toolbar.first().textContent()).toContain("Pause"); // starts playing
  const playing = await boxes();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  expect(await toolbar.first().textContent()).toContain("Play");
  const paused = await boxes();

  // Every button, including the one that changes label, keeps the same position and width.
  expect(paused).toEqual(playing);
});

// Protects against: table columns shifting sideways as operators change status while scrubbing. Moves through all
// three statuses.
test("table columns hold still as statuses change while scrubbing", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const slider = page.getByRole("slider", { name: "Exercise timeline" });
  const columns = () =>
    page.getByRole("columnheader").evaluateAll((ths) =>
      ths.map((th) => {
        const r = th.getBoundingClientRect();
        return `${Math.round(r.x)}:${Math.round(r.width)}`;
      }),
    );

  await slider.focus();
  await page.keyboard.press("Home"); // everyone nominal
  const nominal = await columns();
  await page
    .getByRole("region", { name: "Events" })
    .getByRole("button", { name: /Missed alert: channel congestion/ })
    .click(); // 9:00, attention
  const attention = await columns();
  await page
    .getByRole("region", { name: "Events" })
    .getByRole("button", { name: /Autonomy flagged an unusual vessel track/ })
    .click(); // 12:20, critical
  const critical = await columns();
  await expect(page.getByRole("button", { name: /Why critical\? Operator 03/ })).toBeVisible(); // it really got there

  expect(attention).toEqual(nominal);
  expect(critical).toEqual(nominal);
});

// Protects against: content overflowing its table cell. A fixed-layout table never resizes, so a wider button
// sticks out and hides part of the table.
test("operator table content fits its cells, with no sideways scrolling inside the panel", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const events = page.getByRole("region", { name: "Events" });

  for (const width of [1280, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const moment of [
      /Initial report received/,
      /Missed alert: channel congestion/,
      /Autonomy flagged an unusual vessel track/,
    ]) {
      await events.getByRole("button", { name: moment }).click(); // nominal, attention, critical
      const result = await page.getByRole("table", { name: /Operators in Team/ }).evaluate((table) => {
        const scroller = table.parentElement!;
        const outside = [...table.querySelectorAll("th, td")].flatMap((cell) => {
          const c = cell.getBoundingClientRect();
          return [...cell.querySelectorAll("button, span, time")]
            .filter((el) => el.getBoundingClientRect().width > 0 && !el.classList.contains("sr-only"))
            .filter((el) => el.getBoundingClientRect().right > c.right + 0.5)
            .map((el) => `${(el.textContent ?? "").trim().slice(0, 24)} sticks out of its cell`);
        });
        return { scrolls: scroller.scrollWidth > scroller.clientWidth + 1, outside };
      });
      expect(result.scrolls, `the table panel scrolls sideways at ${width}px`).toBe(false);
      expect(result.outside).toEqual([]);
    }
  }
});

// Protects against: the Alerts card changing height as an alert becomes active or fades, which moves everything
// below it while scrubbing.
test("the Alerts card keeps its height whether or not an alert is active", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const events = page.getByRole("region", { name: "Events" });
  const card = page.getByText("Alerts", { exact: true }).locator("xpath=ancestor::div[contains(@class,'panel')][1]");

  for (const width of [1280, 768, 400]) {
    await page.setViewportSize({ width, height: 900 });
    await events.getByRole("button", { name: /Missed alert: channel congestion/ }).click(); // 9:00: an alert is active
    await expect(page.getByText(/Active now/)).toBeVisible();
    const active = (await card.boundingBox())!.height;
    await events.getByRole("button", { name: /Track monitoring returned to Operator 01/ }).click(); // 14:00: nothing active
    await expect(page.getByText(/None in the last/)).toBeVisible();
    const quiet = (await card.boundingBox())!.height;
    expect(quiet, `card height changed at ${width}px`).toBe(active);
  }
});

// Protects against: a unit stranded on its own line away from its number ("90" / "s"). Screen width is swept
// because the break only lands badly at some widths.
test("a number is never separated from its unit by a line break", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page
    .getByRole("region", { name: "Events" })
    .getByRole("button", { name: /Missed alert: channel congestion/ })
    .click();
  await expect(page.getByText(/Active now/)).toBeVisible();
  // `text-wrap: pretty` is not in every browser. It is switched off so this checks the no-break space, which
  // protects the rest.
  await page.addStyleTag({ content: "* { text-wrap: wrap !important; }" });

  const split: number[] = [];
  for (let width = 340; width <= 1300; width += 20) {
    await page.setViewportSize({ width, height: 900 });
    const apart = await page.evaluate(() => {
      const dd = [...document.querySelectorAll("dd")].find((d) => /Active now/.test(d.textContent ?? ""))!;
      const walker = document.createTreeWalker(dd, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const m = /90(\s)s/.exec(n.textContent ?? "");
        if (!m) continue;
        const range = (from: number, to: number) => {
          const r = document.createRange();
          r.setStart(n, from);
          r.setEnd(n, to);
          return r.getBoundingClientRect();
        };
        const number = range(m.index, m.index + 2);
        const unit = range(m.index + 3, m.index + 4);
        return Math.abs(unit.top - number.top);
      }
      return -1;
    });
    expect(apart, `could not find "90 s" at ${width}px`).toBeGreaterThanOrEqual(0);
    if (apart > 2) split.push(width);
  }
  expect(split, "widths where the unit is on a different line from its number").toEqual([]);
});

// Protects against: the live/paused/replay text changing length and growing the row it sits in, which pushes the page
// below it down
for (const width of [320, 640, 1280]) {
  test(`the feed status keeps its size and its row keeps its height, at ${width}px wide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?t=740");
    const status = page.getByTestId("feed-status");
    const row = status.locator("xpath=ancestor::div[contains(@class,'flex-wrap')][1]");
    const measure = async () => ({
      statusWidth: Math.round((await status.locator("..").boundingBox())!.width),
      rowHeight: Math.round((await row.boundingBox())!.height),
    });

    await expect(status).toHaveText("Replay · 5:40 behind live");
    const replay = await measure();
    await page.getByRole("button", { name: "Go live" }).click();
    await expect(status).toHaveText("Paused");
    const paused = await measure();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(status).toHaveText("Live");
    const live = await measure();

    expect(paused.statusWidth, "Paused changed the width").toBe(replay.statusWidth);
    expect(live.statusWidth, "Live changed the width").toBe(replay.statusWidth);
    // The caption beside it differs from moment to moment, so row heights are compared only where the moment is the same.
    expect(live.rowHeight, "going from Paused to Live changed the row height").toBe(paused.rowHeight);
  });
}
