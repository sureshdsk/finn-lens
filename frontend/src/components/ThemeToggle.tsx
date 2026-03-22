import { Sun, Moon } from "lucide-react";
import { useDarkMode } from "@/contexts/DarkModeContext";

const ThemeToggle = () => {
  const { isDark, setColorMode } = useDarkMode();

  return (
    <button
      onClick={() => setColorMode(isDark ? "light" : "dark")}
      className="w-8 h-8 rounded-sm bg-card border border-border shadow-sm flex items-center justify-center hover:bg-primary/[0.05] transition-all"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-3.5 h-3.5 text-muted-foreground" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </button>
  );
};

export default ThemeToggle;
