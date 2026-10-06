import { describe, expect, it } from "vitest";
import { formatSpoken } from "./format";

describe("format", () => {
  // Protects against: screen readers hearing digits instead of words, or wrong plurals
  it("speaks time for screen readers with correct plurals", () => {
    expect(formatSpoken(760)).toBe("12 minutes 40 seconds");
    expect(formatSpoken(61)).toBe("1 minute 1 second");
    expect(formatSpoken(120)).toBe("2 minutes");
    expect(formatSpoken(0)).toBe("0 seconds");
  });
});
