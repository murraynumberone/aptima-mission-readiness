import { SegmentedControl } from "@mission-readiness/ui";
import { themeChoices } from "../lib/theme";
import { useTheme } from "./ThemeProvider";

const dot = (selected: boolean) => (
  <span aria-hidden className={`size-2 rounded-full border border-current ${selected ? "bg-current" : ""}`} />
);

/** The four-way theme choice. Compact, so it can live in the app bar. */
export function ThemeSwitcher() {
  const { choice, setChoice } = useTheme();
  return (
    <SegmentedControl
      legend="Theme"
      name="theme"
      value={choice}
      onChange={setChoice}
      options={themeChoices.map((c) => ({ value: c.value, label: c.label, icon: dot }))}
    />
  );
}
