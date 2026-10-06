import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  applyDim,
  applyTheme,
  prefersDark,
  readChoice,
  readDim,
  resolveTheme,
  writeChoice,
  writeDim,
  type Theme,
  type ThemeChoice,
} from "../lib/theme";

interface ThemeContextValue {
  choice: ThemeChoice;
  theme: Theme;
  setChoice: (c: ThemeChoice) => void;
  /** Night brightness, 40 to 100. */
  dim: number;
  setDim: (n: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState(readChoice);
  const [dark, setDark] = useState(prefersDark);
  const [dim, setDimState] = useState(readDim);
  const theme = resolveTheme(choice, dark);

  // Follow the OS while the choice is "system".
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setDark(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => applyTheme(theme, { animate: true }), [theme]);
  useEffect(() => applyDim(dim), [dim]);

  const setChoice = useCallback((c: ThemeChoice) => {
    writeChoice(c);
    setChoiceState(c);
  }, []);
  const setDim = useCallback((n: number) => {
    writeDim(n);
    setDimState(n);
  }, []);

  const value = useMemo(() => ({ choice, theme, setChoice, dim, setDim }), [choice, theme, setChoice, dim, setDim]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
