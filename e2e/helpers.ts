import type { Locator } from "@playwright/test";

/** The text a screen reader would read from an element: everything except content hidden with aria-hidden. */
export const spoken = (locator: Locator) =>
  locator.evaluate((el) => {
    const clone = el.cloneNode(true) as Element;
    clone.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => hidden.remove());
    return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
  });
