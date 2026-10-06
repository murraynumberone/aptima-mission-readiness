import { describe, expect, it, vi } from "vitest";
import { setMedia } from "../test-media";
import {
  applyTheme,
  DIM_KEY,
  DIM_MAX,
  DIM_MIN,
  readChoice,
  readDim,
  resolveTheme,
  THEME_KEY,
  writeChoice,
} from "./theme";

describe("resolveTheme", () => {
  // Protects against: System choosing the wrong theme for the OS
  it("follows the OS between Day and Ops", () => {
    expect(resolveTheme("system", false)).toBe("day");
    expect(resolveTheme("system", true)).toBe("ops");
  });
  // Protects against: Night being switched on without being asked for
  it("never picks Night from the system preference", () => {
    expect(resolveTheme("system", true)).not.toBe("night");
    expect(resolveTheme("system", false)).not.toBe("night");
  });
  // Protects against: an explicit theme being overridden by the OS
  it("honors an explicit choice regardless of the OS", () => {
    expect(resolveTheme("night", false)).toBe("night");
    expect(resolveTheme("day", true)).toBe("day");
  });
});

describe("stored preference", () => {
  // Protects against: bad saved settings breaking theming: an unknown theme name, an out-of-range brightness, or
  // blocked storage. Each case is checked on its own.
  it("bad saved settings never break theming", () => {
    localStorage.setItem(THEME_KEY, "neon");
    expect(readChoice()).toBe("system");

    expect(readDim()).toBe(DIM_MAX);
    localStorage.setItem(DIM_KEY, "5");
    expect(readDim()).toBe(DIM_MIN);
    localStorage.setItem(DIM_KEY, "250");
    expect(readDim()).toBe(DIM_MAX);
    localStorage.setItem(DIM_KEY, "abc");
    expect(readDim()).toBe(DIM_MAX);

    const boom = () => {
      throw new Error("blocked");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(boom);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(boom);
    expect(readChoice()).toBe("system");
    expect(readDim()).toBe(DIM_MAX);
    expect(() => writeChoice("ops")).not.toThrow();
    vi.restoreAllMocks();
  });
});

describe("applying a theme", () => {
  // Protects against: the cross-fade playing for people who asked for no motion
  it("swaps instantly when the user prefers reduced motion", () => {
    setMedia({ reduced: true });
    applyTheme("night", { animate: true });
    expect(document.documentElement).not.toHaveClass("theme-transition");
    expect(document.documentElement.dataset.theme).toBe("night");
  });
});
