import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type StyleTheme = "retro" | "neubrutalism";

interface StyleThemeContextType {
  styleTheme: StyleTheme;
  setStyleTheme: (theme: StyleTheme) => void;
}

const StyleThemeContext = createContext<StyleThemeContextType | null>(null);

export const useStyleTheme = () => {
  const ctx = useContext(StyleThemeContext);
  if (!ctx) throw new Error("useStyleTheme must be used within StyleThemeProvider");
  return ctx;
};

export const StyleThemeProvider = ({ children }: { children: ReactNode }) => {
  const [styleTheme, setStyleThemeState] = useState<StyleTheme>(() => {
    return (localStorage.getItem("finnlens_style_theme") as StyleTheme) || "retro";
  });

  const setStyleTheme = (theme: StyleTheme) => {
    setStyleThemeState(theme);
    localStorage.setItem("finnlens_style_theme", theme);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("retro", "neubrutalism");
    root.classList.add(styleTheme);
  }, [styleTheme]);

  return (
    <StyleThemeContext.Provider value={{ styleTheme, setStyleTheme }}>
      {children}
    </StyleThemeContext.Provider>
  );
};
