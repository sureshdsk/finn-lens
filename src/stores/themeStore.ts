import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeName = 'ocean' | 'glass' | 'forest' | 'royal';
export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryHover: string;
  accent: string;
  accentHover: string;
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
}

export interface Theme {
  name: ThemeName;
  displayName: string;
  emoji: string;
  light: ThemeColors;
  dark: ThemeColors;
}

// Define 4 beautiful color schemes
export const themes: Record<ThemeName, Theme> = {
  ocean: {
    name: 'ocean',
    displayName: 'Ocean Breeze',
    emoji: '🌊',
    light: {
      primary: '#0ea5e9',
      primaryHover: '#0284c7',
      primaryLight: '#e0f2fe',
      primaryDark: '#075985',
      secondary: '#38bdf8',
      secondaryHover: '#0ea5e9',
      accent: '#f59e0b',
      accentHover: '#d97706',
      background: '#f0f9ff',
      backgroundAlt: '#ffffff',
      surface: '#ffffff',
      surfaceBorder: '#bae6fd',
      text: '#0c4a6e',
      textSecondary: '#075985',
      textMuted: '#0284c7',
    },
    dark: {
      primary: '#38bdf8',
      primaryHover: '#7dd3fc',
      primaryLight: '#082f49',
      primaryDark: '#e0f2fe',
      secondary: '#0ea5e9',
      secondaryHover: '#38bdf8',
      accent: '#fbbf24',
      accentHover: '#fcd34d',
      background: '#0c1a2b',
      backgroundAlt: '#0f2942',
      surface: '#134169',
      surfaceBorder: '#1e5a8e',
      text: '#e0f2fe',
      textSecondary: '#bae6fd',
      textMuted: '#7dd3fc',
    },
  },
  glass: {
    name: 'glass',
    displayName: 'Glass Morphism',
    emoji: '💎',
    light: {
      primary: '#06b6d4',
      primaryHover: '#0891b2',
      primaryLight: '#cffafe',
      primaryDark: '#0e7490',
      secondary: '#14b8a6',
      secondaryHover: '#0d9488',
      accent: '#fbbf24',
      accentHover: '#f59e0b',
      background: 'linear-gradient(135deg, #fef3c7 0%, #ccfbf1 50%, #cffafe 100%)',
      backgroundAlt: 'rgba(255, 255, 255, 0.85)',
      surface: 'rgba(255, 255, 255, 0.65)',
      surfaceBorder: 'rgba(20, 184, 166, 0.15)',
      text: '#0c4a6e',
      textSecondary: '#0e7490',
      textMuted: '#06b6d4',
    },
    dark: {
      primary: '#22d3ee',
      primaryHover: '#67e8f9',
      primaryLight: 'rgba(6, 182, 212, 0.15)',
      primaryDark: '#a5f3fc',
      secondary: '#2dd4bf',
      secondaryHover: '#5eead4',
      accent: '#fcd34d',
      accentHover: '#fde68a',
      background: 'linear-gradient(135deg, #0c4a6e 0%, #134e4a 50%, #1e3a8a 100%)',
      backgroundAlt: 'rgba(12, 74, 110, 0.85)',
      surface: 'rgba(15, 23, 42, 0.75)',
      surfaceBorder: 'rgba(45, 212, 191, 0.25)',
      text: '#cffafe',
      textSecondary: '#a5f3fc',
      textMuted: '#67e8f9',
    },
  },
  forest: {
    name: 'forest',
    displayName: 'Forest Mist',
    emoji: '🌲',
    light: {
      primary: '#10b981',
      primaryHover: '#059669',
      primaryLight: '#d1fae5',
      primaryDark: '#065f46',
      secondary: '#34d399',
      secondaryHover: '#10b981',
      accent: '#8b5cf6',
      accentHover: '#7c3aed',
      background: '#f0fdf4',
      backgroundAlt: '#ffffff',
      surface: '#ffffff',
      surfaceBorder: '#a7f3d0',
      text: '#064e3b',
      textSecondary: '#065f46',
      textMuted: '#059669',
    },
    dark: {
      primary: '#34d399',
      primaryHover: '#6ee7b7',
      primaryLight: '#022c22',
      primaryDark: '#d1fae5',
      secondary: '#10b981',
      secondaryHover: '#34d399',
      accent: '#a78bfa',
      accentHover: '#c4b5fd',
      background: '#0a1f1a',
      backgroundAlt: '#0f2e28',
      surface: '#1a4d3f',
      surfaceBorder: '#276749',
      text: '#d1fae5',
      textSecondary: '#a7f3d0',
      textMuted: '#6ee7b7',
    },
  },
  royal: {
    name: 'royal',
    displayName: 'Royal Night',
    emoji: '👑',
    light: {
      primary: '#7c3aed',
      primaryHover: '#6d28d9',
      primaryLight: '#f3e8ff',
      primaryDark: '#5b21b6',
      secondary: '#a78bfa',
      secondaryHover: '#8b5cf6',
      accent: '#eab308',
      accentHover: '#ca8a04',
      background: '#faf5ff',
      backgroundAlt: '#ffffff',
      surface: '#ffffff',
      surfaceBorder: '#e9d5ff',
      text: '#4c1d95',
      textSecondary: '#5b21b6',
      textMuted: '#7c3aed',
    },
    dark: {
      primary: '#a78bfa',
      primaryHover: '#c4b5fd',
      primaryLight: '#2e1065',
      primaryDark: '#f3e8ff',
      secondary: '#8b5cf6',
      secondaryHover: '#a78bfa',
      accent: '#fde047',
      accentHover: '#fef08a',
      background: '#1a0d2e',
      backgroundAlt: '#2d1b4e',
      surface: '#4c2d7a',
      surfaceBorder: '#6b46a2',
      text: '#f3e8ff',
      textSecondary: '#e9d5ff',
      textMuted: '#c4b5fd',
    },
  },
};

interface ThemeStore {
  currentTheme: ThemeName;
  currentMode: ThemeMode;
  setTheme: (theme: ThemeName) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  getCurrentColors: () => ThemeColors;
  applyTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      currentTheme: 'ocean',
      currentMode: 'light',

      setTheme: (theme: ThemeName) => {
        set({ currentTheme: theme });
        get().applyTheme();
      },

      setMode: (mode: ThemeMode) => {
        set({ currentMode: mode });
        get().applyTheme();
      },

      toggleMode: () => {
        const newMode = get().currentMode === 'light' ? 'dark' : 'light';
        set({ currentMode: newMode });
        get().applyTheme();
      },

      getCurrentColors: () => {
        const { currentTheme, currentMode } = get();
        return themes[currentTheme][currentMode];
      },

      applyTheme: () => {
        const colors = get().getCurrentColors();
        const root = document.documentElement;

        // Apply CSS variables
        Object.entries(colors).forEach(([key, value]) => {
          root.style.setProperty(`--color-${key}`, value);
        });

        // Apply background directly to body to support gradients
        const bodyBg = colors.background;
        if (bodyBg.startsWith('linear-gradient') || bodyBg.startsWith('radial-gradient')) {
          document.body.style.background = bodyBg;
        } else {
          document.body.style.background = '';
          document.body.style.backgroundColor = bodyBg;
        }

        // Update body class for dark mode
        if (get().currentMode === 'dark') {
          document.body.classList.add('dark-mode');
        } else {
          document.body.classList.remove('dark-mode');
        }
      },
    }),
    {
      name: 'gpay-wrapped-theme',
      partialize: (state) => ({
        currentTheme: state.currentTheme,
        currentMode: state.currentMode,
      }),
    }
  )
);

// Apply theme on initial load
if (typeof window !== 'undefined') {
  const store = useThemeStore.getState();
  store.applyTheme();
}
