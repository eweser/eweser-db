import type { ReactNode } from 'react';
import { useTheme as useAppTheme } from '@/components/theme-provider';

type Theme = 'light' | 'dark';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useTheme() {
  const theme = useAppTheme();

  return {
    ...theme,
    theme: theme.resolvedMode as Theme,
    toggleTheme: () =>
      theme.setMode(theme.resolvedMode === 'light' ? 'dark' : 'light'),
    setTheme: (nextTheme: Theme) => theme.setMode(nextTheme),
  };
}
