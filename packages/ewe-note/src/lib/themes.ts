export type ThemeMode = 'light' | 'dark';

export interface ThemeVars {
  '--background': string;
  '--foreground': string;
  '--card': string;
  '--card-foreground': string;
  '--popover': string;
  '--popover-foreground': string;
  '--primary': string;
  '--primary-foreground': string;
  '--secondary': string;
  '--secondary-foreground': string;
  '--muted': string;
  '--muted-foreground': string;
  '--accent': string;
  '--accent-foreground': string;
  '--destructive': string;
  '--destructive-foreground': string;
  '--border': string;
  '--input': string;
  '--ring': string;
  '--sidebar-background': string;
  '--sidebar-foreground': string;
  '--sidebar-primary': string;
  '--sidebar-primary-foreground': string;
  '--sidebar-accent': string;
  '--sidebar-accent-foreground': string;
  '--sidebar-border': string;
  '--sidebar-ring': string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  mode: ThemeMode;
  vars: ThemeVars;
}

export const PRESET_THEMES: ThemeDefinition[] = [
  {
    id: 'paper',
    name: 'Paper',
    mode: 'light',
    vars: {
      '--background': 'hsl(45 30% 94%)',
      '--foreground': 'hsl(30 20% 15%)',
      '--card': 'hsl(45 28% 97%)',
      '--card-foreground': 'hsl(30 20% 15%)',
      '--popover': 'hsl(45 28% 97%)',
      '--popover-foreground': 'hsl(30 20% 15%)',
      '--primary': 'hsl(224 40% 47%)',
      '--primary-foreground': 'hsl(224 41% 96%)',
      '--secondary': 'hsl(28 50% 70%)',
      '--secondary-foreground': 'hsl(28 30% 20%)',
      '--muted': 'hsl(42 25% 88%)',
      '--muted-foreground': 'hsl(30 15% 45%)',
      '--accent': 'hsl(42 25% 88%)',
      '--accent-foreground': 'hsl(30 20% 15%)',
      '--destructive': 'hsl(0 72% 51%)',
      '--destructive-foreground': 'hsl(0 0% 98%)',
      '--border': 'hsl(38 20% 80%)',
      '--input': 'hsl(38 20% 80%)',
      '--ring': 'hsl(30 20% 15%)',
      '--sidebar-background': 'hsl(40 25% 90%)',
      '--sidebar-foreground': 'hsl(30 18% 28%)',
      '--sidebar-primary': 'hsl(30 20% 15%)',
      '--sidebar-primary-foreground': 'hsl(45 30% 94%)',
      '--sidebar-accent': 'hsl(40 22% 84%)',
      '--sidebar-accent-foreground': 'hsl(30 20% 15%)',
      '--sidebar-border': 'hsl(38 18% 78%)',
      '--sidebar-ring': 'hsl(217 91% 60%)',
    },
  },
  {
    id: 'clean',
    name: 'Clean',
    mode: 'light',
    vars: {
      '--background': 'hsl(0 0% 100%)',
      '--foreground': 'hsl(222.2 84% 4.9%)',
      '--card': 'hsl(0 0% 100%)',
      '--card-foreground': 'hsl(222.2 84% 4.9%)',
      '--popover': 'hsl(0 0% 100%)',
      '--popover-foreground': 'hsl(222.2 84% 4.9%)',
      '--primary': 'hsl(224.21 39.75% 46.86%)',
      '--primary-foreground': 'hsl(223.93 41.18% 95.67%)',
      '--secondary': 'hsl(22.3 84.96% 73.92%)',
      '--secondary-foreground': 'hsl(21.75 34.78% 100%)',
      '--muted': 'hsl(210 40% 96.1%)',
      '--muted-foreground': 'hsl(215.4 16.3% 46.9%)',
      '--accent': 'hsl(210 40% 96.1%)',
      '--accent-foreground': 'hsl(222.2 47.4% 11.2%)',
      '--destructive': 'hsl(0 84.2% 60.2%)',
      '--destructive-foreground': 'hsl(210 40% 98%)',
      '--border': 'hsl(214.3 31.8% 91.4%)',
      '--input': 'hsl(214.3 31.8% 91.4%)',
      '--ring': 'hsl(222.2 84% 4.9%)',
      '--sidebar-background': 'hsl(0 0% 98%)',
      '--sidebar-foreground': 'hsl(240 5.3% 26.1%)',
      '--sidebar-primary': 'hsl(240 5.9% 10%)',
      '--sidebar-primary-foreground': 'hsl(0 0% 98%)',
      '--sidebar-accent': 'hsl(240 4.8% 95.9%)',
      '--sidebar-accent-foreground': 'hsl(240 5.9% 10%)',
      '--sidebar-border': 'hsl(220 13% 91%)',
      '--sidebar-ring': 'hsl(217.2 91.2% 59.8%)',
    },
  },
  {
    id: 'true-black',
    name: 'True Black',
    mode: 'dark',
    vars: {
      '--background': 'hsl(0 0% 0%)',
      '--foreground': 'hsl(0 0% 95%)',
      '--card': 'hsl(0 0% 4%)',
      '--card-foreground': 'hsl(0 0% 95%)',
      '--popover': 'hsl(0 0% 4%)',
      '--popover-foreground': 'hsl(0 0% 95%)',
      '--primary': 'hsl(224 40% 55%)',
      '--primary-foreground': 'hsl(224 41% 96%)',
      '--secondary': 'hsl(22 35% 40%)',
      '--secondary-foreground': 'hsl(22 60% 90%)',
      '--muted': 'hsl(0 0% 12%)',
      '--muted-foreground': 'hsl(0 0% 60%)',
      '--accent': 'hsl(0 0% 12%)',
      '--accent-foreground': 'hsl(0 0% 95%)',
      '--destructive': 'hsl(0 63% 31%)',
      '--destructive-foreground': 'hsl(210 40% 98%)',
      '--border': 'hsl(0 0% 14%)',
      '--input': 'hsl(0 0% 14%)',
      '--ring': 'hsl(0 0% 70%)',
      '--sidebar-background': 'hsl(0 0% 5%)',
      '--sidebar-foreground': 'hsl(0 0% 88%)',
      '--sidebar-primary': 'hsl(224 76% 50%)',
      '--sidebar-primary-foreground': 'hsl(0 0% 100%)',
      '--sidebar-accent': 'hsl(0 0% 10%)',
      '--sidebar-accent-foreground': 'hsl(0 0% 88%)',
      '--sidebar-border': 'hsl(0 0% 10%)',
      '--sidebar-ring': 'hsl(217 91% 60%)',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    mode: 'dark',
    vars: {
      '--background': 'hsl(222.2 84% 4.9%)',
      '--foreground': 'hsl(210 40% 98%)',
      '--card': 'hsl(222.2 84% 4.9%)',
      '--card-foreground': 'hsl(210 40% 98%)',
      '--popover': 'hsl(222.2 84% 4.9%)',
      '--popover-foreground': 'hsl(210 40% 98%)',
      '--primary': 'hsl(224.21 39.75% 46.86%)',
      '--primary-foreground': 'hsl(223.93 41.18% 95%)',
      '--secondary': 'hsl(21.75 34.78% 45.1%)',
      '--secondary-foreground': 'hsl(22.3 84.96% 95%)',
      '--muted': 'hsl(217.2 32.6% 17.5%)',
      '--muted-foreground': 'hsl(215 20.2% 65.1%)',
      '--accent': 'hsl(217.2 32.6% 17.5%)',
      '--accent-foreground': 'hsl(210 40% 98%)',
      '--destructive': 'hsl(0 62.8% 30.6%)',
      '--destructive-foreground': 'hsl(210 40% 98%)',
      '--border': 'hsl(217.2 32.6% 17.5%)',
      '--input': 'hsl(217.2 32.6% 17.5%)',
      '--ring': 'hsl(212.7 26.8% 83.9%)',
      '--sidebar-background': 'hsl(240 5.9% 10%)',
      '--sidebar-foreground': 'hsl(240 4.8% 95.9%)',
      '--sidebar-primary': 'hsl(224.3 76.3% 48%)',
      '--sidebar-primary-foreground': 'hsl(0 0% 100%)',
      '--sidebar-accent': 'hsl(240 3.7% 15.9%)',
      '--sidebar-accent-foreground': 'hsl(240 4.8% 95.9%)',
      '--sidebar-border': 'hsl(240 3.7% 15.9%)',
      '--sidebar-ring': 'hsl(217.2 91.2% 59.8%)',
    },
  },
];

export function getThemeById(id: string): ThemeDefinition | undefined {
  return PRESET_THEMES.find((t) => t.id === id);
}

export function getThemesByMode(mode: ThemeMode): ThemeDefinition[] {
  return PRESET_THEMES.filter((t) => t.mode === mode);
}

/** Apply a theme's CSS variables directly onto the root element */
export function applyThemeVars(vars: ThemeVars): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

/** Clear any inline CSS variable overrides (falls back to stylesheet values) */
export function clearThemeVars(vars: ThemeVars): void {
  const root = document.documentElement;
  for (const key of Object.keys(vars)) {
    root.style.removeProperty(key);
  }
}

// Preview color swatches for each theme (background, sidebar bg, primary)
export const THEME_SWATCHES: Record<string, [string, string, string]> = {
  paper: ['#f0ead8', '#e0d9c4', '#4f6ab0'],
  clean: ['#ffffff', '#f9f9f9', '#4f6ab0'],
  'true-black': ['#000000', '#0d0d0d', '#4f7acc'],
  midnight: ['#061020', '#17191f', '#4f6ab0'],
};
