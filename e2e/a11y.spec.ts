import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const theme of ["Day", "Ops", "Night"]) {
  // Protects against: accessibility and contrast violations in any theme, with the operator panel, a review and a
  // note on screen, and the Display popover open. Axe checks contrast only in a real browser.
  test(`no axe violations in the ${theme} theme, including color contrast`, async ({ page }) => {
    // The notes sheet starts folded; open it.
    await page.addInitScript(() => localStorage.setItem("mr-notes-open", "true"));
    await page.goto("/");
    await page.getByRole("radio", { name: theme }).check({ force: true }); // uses the real switcher
    await page.getByRole("button", { name: "Pause", exact: true }).click(); // stable values while scanning
    await page.getByRole("button", { name: /Why (attention|critical)\? Operator 03/ }).click(); // scan with the panel open
    // then with debrief content on screen: a review, a note, and the composer on an event
    await page
      .getByRole("region", { name: "Events" })
      .getByRole("button", { name: /Missed alert: channel congestion/ })
      .click();
    await page.getByRole("radio", { name: "Adjusted" }).check({ force: true });
    await page.getByRole("textbox", { name: "Note", exact: true }).fill("A note to scan");
    await page.getByRole("button", { name: "Save note" }).click();
    await page.waitForTimeout(350); // let the cross-fade finish so contrast is measured on final colors
    const scan = async () => {
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      // Include the measured colors, so a contrast failure explains itself without a second investigation.
      return results.violations.map((v) => {
        const sample = v.nodes.slice(0, 3).map((n) => {
          const d = n.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined;
          return `${n.target.join(" ").slice(0, 60)}${d?.contrastRatio ? ` [${d.fgColor} on ${d.bgColor} = ${d.contrastRatio}]` : ""}`;
        });
        return `${v.id}: ${v.nodes.length} element(s), e.g. ${sample.join(" | ")}`;
      });
    };

    expect(await scan(), "violations on the page").toEqual([]);

    await page.getByRole("button", { name: "Display" }).click();
    await expect(page.getByRole("dialog", { name: "Display" })).toBeVisible();
    await page.waitForTimeout(350); // let the popover finish fading in: axe can't judge contrast on a half-transparent element
    expect(await scan(), "violations with the Display popover open").toEqual([]);
  });
}

// Protects against: a button's hover state failing contrast (the filled primary button once dropped Night to
// 4.31:1). Page scans never hover, so this hovers it in every theme.
test("the primary button stays readable while hovered, in every theme", async ({ page }) => {
  await page.goto("/");
  const primary = page.getByRole("region", { name: "Playback" }).locator("button").first();
  for (const theme of ["Day", "Ops", "Night"]) {
    await page.getByRole("radio", { name: theme }).check({ force: true });
    await page.waitForTimeout(350); // let the cross-fade finish
    await primary.hover();
    const results = await new AxeBuilder({ page }).include(".btn-primary").withRules(["color-contrast"]).analyze();
    const failing = results.violations.flatMap((v) =>
      v.nodes.map((n) => (n.any[0]?.data as { contrastRatio?: number })?.contrastRatio),
    );
    expect(failing, `${theme}: hovered primary button fails contrast`).toEqual([]);
  }
});
