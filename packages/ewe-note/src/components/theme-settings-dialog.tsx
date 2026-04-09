import { useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/components/theme-provider';
import {
  getThemesByMode,
  PRESET_THEMES,
  THEME_SWATCHES,
  type ThemeVars,
} from '@/lib/themes';

// ----- Custom theme defaults (used as seed when user opens custom editor) -----
const CUSTOM_LIGHT_SEED: ThemeVars =
  getThemesByMode('light')[0]?.vars ?? PRESET_THEMES[0].vars;
const CUSTOM_DARK_SEED: ThemeVars =
  getThemesByMode('dark')[0]?.vars ?? PRESET_THEMES[2].vars;

// ----- Hex ↔ HSL helpers -----
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

function hslToHex(hsl: string): string {
  const match = hsl.match(
    /hsl\((\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\)/
  );
  if (!match) return '#888888';
  const h = parseFloat(match[1]) / 360;
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ----- Theme Card -----
interface ThemeCardProps {
  id: string;
  name: string;
  swatches: [string, string, string];
  isActive: boolean;
  onClick: () => void;
}

function ThemeCard({
  id: _id,
  name,
  swatches,
  isActive,
  onClick,
}: Readonly<ThemeCardProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-all cursor-pointer hover:border-primary ${
        isActive ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      }`}
      aria-label={`Select ${name} theme`}
    >
      {isActive && (
        <span className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
          <Check className="h-2.5 w-2.5" />
        </span>
      )}
      <div className="flex w-full h-8 rounded overflow-hidden">
        <div className="flex-1" style={{ background: swatches[0] }} />
        <div className="w-5" style={{ background: swatches[1] }} />
        <div className="w-3" style={{ background: swatches[2] }} />
      </div>
      <span className="text-xs font-medium">{name}</span>
    </button>
  );
}

// ----- Custom Theme Editor -----
const CUSTOM_FIELDS: { key: keyof ThemeVars; label: string }[] = [
  { key: '--background', label: 'Background' },
  { key: '--foreground', label: 'Text' },
  { key: '--primary', label: 'Primary' },
  { key: '--secondary', label: 'Secondary' },
  { key: '--muted', label: 'Muted' },
  { key: '--border', label: 'Border' },
  { key: '--sidebar-background', label: 'Sidebar' },
];

interface CustomThemeEditorProps {
  seed: ThemeVars;
  initial: ThemeVars | null;
  onSave: (vars: ThemeVars) => void;
  onCancel: () => void;
}

function CustomThemeEditor({
  seed,
  initial,
  onSave,
  onCancel,
}: Readonly<CustomThemeEditorProps>) {
  const [vars, setVars] = useState<ThemeVars>(initial ?? seed);

  const handleColorChange = (key: keyof ThemeVars, hex: string) => {
    setVars((prev) => ({ ...prev, [key]: hexToHsl(hex) }));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {CUSTOM_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <input
              type="color"
              value={hslToHex(vars[key])}
              onChange={(e) => handleColorChange(key, e.target.value)}
              className="h-7 w-7 rounded border border-border cursor-pointer bg-transparent"
              title={label}
            />
            <Label className="text-xs">{label}</Label>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => onSave(vars)}>
          Save custom theme
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ----- Theme Section (light or dark) -----
interface ThemeSectionProps {
  modeLabel: string;
  themeMode: 'light' | 'dark';
  activeId: string;
  onSelect: (id: string) => void;
  customVars: ThemeVars | null;
  onSaveCustom: (vars: ThemeVars | null) => void;
}

function ThemeSection({
  modeLabel,
  themeMode,
  activeId,
  onSelect,
  customVars,
  onSaveCustom,
}: Readonly<ThemeSectionProps>) {
  const presets = getThemesByMode(themeMode);
  const [editingCustom, setEditingCustom] = useState(false);
  const seed = themeMode === 'light' ? CUSTOM_LIGHT_SEED : CUSTOM_DARK_SEED;

  const handleSelectCustom = () => {
    onSelect('custom');
    setEditingCustom(true);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {modeLabel} themes
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {presets.map((theme) => (
          <ThemeCard
            key={theme.id}
            id={theme.id}
            name={theme.name}
            swatches={THEME_SWATCHES[theme.id] ?? ['#888', '#666', '#444']}
            isActive={activeId === theme.id}
            onClick={() => onSelect(theme.id)}
          />
        ))}
        {/* Custom card */}
        <button
          type="button"
          onClick={handleSelectCustom}
          className={`relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-all cursor-pointer hover:border-primary ${
            activeId === 'custom'
              ? 'border-primary ring-2 ring-primary/30'
              : 'border-dashed border-border'
          }`}
          aria-label="Create custom theme"
        >
          {activeId === 'custom' && (
            <span className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
              <Check className="h-2.5 w-2.5" />
            </span>
          )}
          <div className="flex items-center justify-center w-full h-8 rounded bg-muted">
            <Palette className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-xs font-medium">Custom</span>
        </button>
      </div>

      {/* Custom editor - shown when custom is selected */}
      {(editingCustom || activeId === 'custom') && (
        <div className="rounded-lg border border-border p-3 space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Customize colors</span>
            {activeId === 'custom' && !editingCustom && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingCustom(true)}
              >
                Edit
              </Button>
            )}
          </div>
          {editingCustom && (
            <CustomThemeEditor
              seed={seed}
              initial={customVars}
              onSave={(vars) => {
                onSaveCustom(vars);
                onSelect('custom');
                setEditingCustom(false);
              }}
              onCancel={() => {
                setEditingCustom(false);
                // If there was no saved custom, revert to first preset
                if (!customVars) {
                  onSelect(presets[0]?.id ?? '');
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ----- Main Dialog -----
interface ThemeSettingsDialogProps {
  /** Custom trigger element. If omitted, renders a default button. */
  trigger?: React.ReactNode;
}

export function ThemeSettingsDialog({
  trigger,
}: Readonly<ThemeSettingsDialogProps>) {
  const {
    lightThemeId,
    setLightThemeId,
    darkThemeId,
    setDarkThemeId,
    customLightVars,
    setCustomLightVars,
    customDarkVars,
    setCustomDarkVars,
  } = useTheme();

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Palette className="h-4 w-4 mr-2" />
            Themes
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Theme Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <ThemeSection
            modeLabel="Light"
            themeMode="light"
            activeId={lightThemeId}
            onSelect={setLightThemeId}
            customVars={customLightVars}
            onSaveCustom={setCustomLightVars}
          />
          <div className="border-t border-border" />
          <ThemeSection
            modeLabel="Dark"
            themeMode="dark"
            activeId={darkThemeId}
            onSelect={setDarkThemeId}
            customVars={customDarkVars}
            onSaveCustom={setCustomDarkVars}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
