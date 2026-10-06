import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setMedia } from "../test-media";
import { spokenText } from "../test-utils";
import { AnimatedNumber } from "./AnimatedNumber";

const pct = (n: number) => `${Math.round(n)}%`;
const digits = (c: HTMLElement) => c.querySelector('[aria-hidden="true"]')!.textContent;

describe("AnimatedNumber", () => {
  // Protects against: a screen reader hearing the numbers fly past (or any wrong number) while the digits animate
  it("always speaks the final value, and hides the moving digits from assistive technology", async () => {
    const { container, rerender } = render(<AnimatedNumber value={80} format={pct} />);
    rerender(<AnimatedNumber value={50} format={pct} />);
    expect(spokenText(container)).toBe("50%"); // already final, even though the digits are still counting down
    await waitFor(() => expect(digits(container)).toBe("50%"), { timeout: 2000 });
    expect(spokenText(container)).toBe("50%");
  });

  // Protects against: counting up from nothing every time the page loads (it should only follow changes you make)
  it("shows its value straight away on first render", () => {
    const { container } = render(<AnimatedNumber value={77} format={pct} />);
    expect(digits(container)).toBe("77%");
  });

  // Protects against: a count-up playing for someone who asked for reduced motion
  it("jumps straight to the new value when the user prefers reduced motion", () => {
    setMedia({ reduced: true });
    const { container, rerender } = render(<AnimatedNumber value={80} format={pct} />);
    rerender(<AnimatedNumber value={50} format={pct} />);
    expect(digits(container)).toBe("50%"); // no waiting
  });

  // Protects against: the number settling on a stale value after several quick changes (scrubbing)
  it("lands on the latest value after rapid changes", async () => {
    const { container, rerender } = render(<AnimatedNumber value={10} format={pct} />);
    for (const v of [20, 90, 40, 65]) rerender(<AnimatedNumber value={v} format={pct} />);
    await waitFor(() => expect(digits(container)).toBe("65%"), { timeout: 2000 });
    expect(spokenText(container)).toBe("65%");
  });
});
