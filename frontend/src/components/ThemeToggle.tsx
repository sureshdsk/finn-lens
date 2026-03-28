import { Sun, Moon } from "lucide-react";
import { useDarkMode } from "@/contexts/DarkModeContext";

const ThemeToggle = () => {
  const { isDark, setColorMode } = useDarkMode();

  return (
    <button
      onClick={() => setColorMode(isDark ? "light" : "dark")}
      className="w-9 h-9 rounded-lg bg-card border border-border shadow-sm flex items-center justify-center hover:bg-muted/80 transition-all"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-muted-foreground" />
      ) : (
        <Moon className="w-4 h-4 text-muted-foreground" />
      )}
    </button>
  );
};

export default ThemeToggle;
