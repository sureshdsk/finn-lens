import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type ColorMode = "light" | "dark" | "system";

interface DarkModeContextType {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  isDark: boolean;
}

const DarkModeContext = createContext<DarkModeContextType | null>(null);

export const useDarkMode = () => {
  const ctx = useContext(DarkModeContext);
  if (!ctx) throw new Error("useDarkMode must be used within DarkModeProvider");
  return ctx;
};

export const DarkModeProvider = ({ children }: { children: ReactNode }) => {
  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    return (localStorage.getItem("finnlens_color_mode") as ColorMode) || "dark";
  });

  const setColorMode = (mode: ColorMode) => {
    setColorModeState(mode);
    localStorage.setItem("finnlens_color_mode", mode);
  };

  const getSystemPreference = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const isDark = colorMode === "dark" || (colorMode === "system" && getSystemPreference());

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    if (colorMode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const root = document.documentElement;
      if (mq.matches) root.classList.add("dark");
      else root.classList.remove("dark");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [colorMode]);

  return (
    <DarkModeContext.Provider value={{ colorMode, setColorMode, isDark }}>
      {children}
    </DarkModeContext.Provider>
  );
};
