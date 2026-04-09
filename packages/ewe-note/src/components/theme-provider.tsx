import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  applyThemeVars,
  getThemeById,
  PRESET_THEMES,
  type ThemeVars,
} from '@/lib/themes';

export type Mode = 'dark' | 'light' | 'system';

const STORAGE_MODE = 'vite-ui-theme';
const STORAGE_LIGHT_THEME = 'ewe-theme-light';
const STORAGE_DARK_THEME = 'ewe-theme-dark';
const STORAGE_CUSTOM_LIGHT_THEME = 'ewe-theme-custom-light';
const STORAGE_CUSTOM_DARK_THEME = 'ewe-theme-custom-dark';

export interface ThemeProviderState {
  /** Current mode: dark / light / system */
  mode: Mode;
  setMode: (mode: Mode) => void;
  /** ID of the active light theme preset ('custom' for user-defined) */
  lightThemeId: string;
  setLightThemeId: (id: string) => void;
  /** ID of the active dark theme preset ('custom' for user-defined) */
  darkThemeId: string;
  setDarkThemeId: (id: string) => void;
  /** Custom light theme variable overrides */
  customLightVars: ThemeVars | null;
  setCustomLightVars: (vars: ThemeVars | null) => void;
  /** Custom dark theme variable overrides */
  customDarkVars: ThemeVars | null;
  setCustomDarkVars: (vars: ThemeVars | null) => void;
  /** The resolved mode (never 'system') */
  resolvedMode: 'dark' | 'light';
}

const initialState: ThemeProviderState = {
  mode: 'system',
  setMode: () => null,
  lightThemeId: 'paper',
  setLightThemeId: () => null,
  darkThemeId: 'true-black',
  setDarkThemeId: () => null,
  customLightVars: null,
  setCustomLightVars: () => null,
  customDarkVars: null,
  setCustomDarkVars: () => null,
  resolvedMode: 'light',
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: Mode;
  defaultLightThemeId?: string;
  defaultDarkThemeId?: string;
}

function loadCustomVars(key: string): ThemeVars | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ThemeVars) : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({
  children,
  defaultMode = 'system',
  defaultLightThemeId = 'paper',
  defaultDarkThemeId = 'true-black',
  ...props
}: Readonly<ThemeProviderProps>) {
  const [mode, setModeState] = useState<Mode>(
    () => (localStorage.getItem(STORAGE_MODE) as Mode) || defaultMode
  );
  const [lightThemeId, setLightThemeIdState] = useState<string>(
    () => localStorage.getItem(STORAGE_LIGHT_THEME) || defaultLightThemeId
  );
  const [darkThemeId, setDarkThemeIdState] = useState<string>(
    () => localStorage.getItem(STORAGE_DARK_THEME) || defaultDarkThemeId
  );
  const [customLightVars, setCustomLightVarsState] = useState<ThemeVars | null>(
    () => loadCustomVars(STORAGE_CUSTOM_LIGHT_THEME)
  );
  const [customDarkVars, setCustomDarkVarsState] = useState<ThemeVars | null>(
    () => loadCustomVars(STORAGE_CUSTOM_DARK_THEME)
  );

  const resolvedMode = useMemo<'dark' | 'light'>(() => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return mode;
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedMode);

    const activeThemeId = resolvedMode === 'dark' ? darkThemeId : lightThemeId;
    const customVars = resolvedMode === 'dark' ? customDarkVars : customLightVars;

    if (activeThemeId === 'custom' && customVars) {
      applyThemeVars(customVars);
    } else {
      const theme =
        getThemeById(activeThemeId) ??
        PRESET_THEMES.find((t) => t.mode === resolvedMode) ??
        PRESET_THEMES[0];
      applyThemeVars(theme.vars);
    }
  }, [resolvedMode, lightThemeId, darkThemeId, customLightVars, customDarkVars]);

  const setMode = useCallback((newMode: Mode) => {
    localStorage.setItem(STORAGE_MODE, newMode);
    setModeState(newMode);
  }, []);

  const setLightThemeId = useCallback((id: string) => {
    localStorage.setItem(STORAGE_LIGHT_THEME, id);
    setLightThemeIdState(id);
  }, []);

  const setDarkThemeId = useCallback((id: string) => {
    localStorage.setItem(STORAGE_DARK_THEME, id);
    setDarkThemeIdState(id);
  }, []);

  const setCustomLightVars = useCallback((vars: ThemeVars | null) => {
    if (vars) {
      localStorage.setItem(STORAGE_CUSTOM_LIGHT_THEME, JSON.stringify(vars));
    } else {
      localStorage.removeItem(STORAGE_CUSTOM_LIGHT_THEME);
    }
    setCustomLightVarsState(vars);
  }, []);

  const setCustomDarkVars = useCallback((vars: ThemeVars | null) => {
    if (vars) {
      localStorage.setItem(STORAGE_CUSTOM_DARK_THEME, JSON.stringify(vars));
    } else {
      localStorage.removeItem(STORAGE_CUSTOM_DARK_THEME);
    }
    setCustomDarkVarsState(vars);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      lightThemeId,
      setLightThemeId,
      darkThemeId,
      setDarkThemeId,
      customLightVars,
      setCustomLightVars,
      customDarkVars,
      setCustomDarkVars,
      resolvedMode,
    }),
    [
      mode,
      setMode,
      lightThemeId,
      setLightThemeId,
      darkThemeId,
      setDarkThemeId,
      customLightVars,
      setCustomLightVars,
      customDarkVars,
      setCustomDarkVars,
      resolvedMode,
    ]
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
