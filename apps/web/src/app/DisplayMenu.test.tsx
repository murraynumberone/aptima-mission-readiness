import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DisplayMenu } from "./DisplayMenu";
import { ThemeProvider } from "./ThemeProvider";
import { ThemeSwitcher } from "./ThemeSwitcher";

const html = document.documentElement;

function setup() {
  render(
    <ThemeProvider>
      <ThemeSwitcher />
      <DisplayMenu />
    </ThemeProvider>,
  );
  return userEvent.setup();
}
const open = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Display" }));

describe("DisplayMenu", () => {
  // Protects against: a brightness control that looks live in themes where it does nothing
  it("disables brightness outside Night and enables it in Night", async () => {
    const user = setup();
    await open(user);
    expect(screen.getByRole("slider", { name: "Night brightness" })).toBeDisabled();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("radio", { name: /Night/ }));
    await open(user);
    expect(screen.getByRole("slider", { name: "Night brightness" })).toBeEnabled();
  });

  // Protects against: brightness that can't be set by keyboard, isn't remembered, or can dim below the readable floor
  it("dims Night in steps, persists it, and stops at the floor", async () => {
    const user = setup();
    await user.click(screen.getByRole("radio", { name: /Night/ }));
    await open(user);
    const slider = screen.getByRole("slider", { name: "Night brightness" });
    expect(slider).toHaveAttribute("min", "40");
    expect(screen.getByText("100%")).toBeInTheDocument();

    slider.focus();
    await user.keyboard("{ArrowLeft}");
    expect(html.style.getPropertyValue("--night-dim")).toBe("0.95");
    expect(localStorage.getItem("mr-night-dim")).toBe("95");
    await user.keyboard("{Home}");
    expect(html.style.getPropertyValue("--night-dim")).toBe("0.4");
    expect(screen.getByText("40%")).toBeInTheDocument();
  });
});
