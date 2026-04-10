import type { ReactNode } from 'react';
import { useTheme as useAppTheme } from '@/components/theme-provider';

type Theme = 'light' | 'dark';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useTheme() {
  const { resolvedMode, setMode } = useAppTheme();

  return {
    theme: resolvedMode as Theme,
    toggleTheme: () => setMode(resolvedMode === 'light' ? 'dark' : 'light'),
    setTheme: (theme: Theme) => setMode(theme),
  };
}
