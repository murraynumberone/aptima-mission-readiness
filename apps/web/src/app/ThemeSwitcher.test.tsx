import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { setMedia } from "../test-media";
import { ThemeProvider } from "./ThemeProvider";
import { ThemeSwitcher } from "./ThemeSwitcher";

const setup = () => {
  render(
    <ThemeProvider>
      <ThemeSwitcher />
    </ThemeProvider>,
  );
  return userEvent.setup();
};
const html = document.documentElement;

describe("ThemeSwitcher", () => {
  // Protects against: the theme control losing its accessible name, or not defaulting to System
  it("is a named radio group with the four choices, System selected by default", () => {
    setup();
    expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio").map((r) => r.getAttribute("value"))).toEqual(["system", "day", "ops", "night"]);
    expect(screen.getByRole("radio", { name: /System/ })).toBeChecked();
  });

  // Protects against: a theme choice that doesn't apply or is forgotten
  it("switches the theme and persists the choice", async () => {
    const user = setup();
    await user.click(screen.getByRole("radio", { name: /Ops/ }));
    expect(html.dataset.theme).toBe("ops");
    expect(screen.getByRole("radio", { name: /Ops/ })).toBeChecked();
    expect(localStorage.getItem("mr-theme")).toBe("ops");
  });

  // Protects against: a deliberate choice being overridden when the OS changes
  it("an explicit choice ignores later OS changes", async () => {
    const user = setup();
    await user.click(screen.getByRole("radio", { name: /Day/ }));
    act(() => setMedia({ dark: true }));
    expect(html.dataset.theme).toBe("day");
  });
});
