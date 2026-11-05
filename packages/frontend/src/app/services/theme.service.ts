import { Injectable, signal, computed, effect } from '@angular/core';

export type AppTheme =
  | 'oled'
  | 'dark'
  | 'light'
  | 'slate'
  | 'frost'
  | 'cyber'
  | 'hi-contrast'
  | 'emerald'
  | 'nord'
  | 'cyberpunk'
  | 'high-contrast';

export interface ThemeOption {
  readonly id: AppTheme;
  readonly name: string;
  readonly shortLabel: string;
  readonly description: string;
}

/**
 * Service managing global curated theme states with Angular Signals and localStorage persistence.
 * Supports sequential cycling across 8 short-named themes with WCAG AA/AAA contrast conformance.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'cacophony-theme';

  // Default theme is obsidian dark slate
  public readonly currentTheme = signal<AppTheme>('dark');

  // Curated theme roster matching user specification: OLED, DARK, LIGHT, SLATE, FROST, CYBER, HI-CONTRAST, EMERALD
  public readonly availableThemes: readonly ThemeOption[] = [
    { id: 'oled', name: 'OLED Pure Black', shortLabel: 'OLED', description: 'Zero emission #000000 true black dark theme' },
    { id: 'dark', name: 'Dark Slate', shortLabel: 'DARK', description: 'Obsidian deep slate default dark mode' },
    { id: 'light', name: 'Minimalist Light', shortLabel: 'LIGHT', description: 'Clean daylight aesthetic with sharp contrast' },
    { id: 'slate', name: 'Cool Slate', shortLabel: 'SLATE', description: 'Gunmetal slate and sky blue balance' },
    { id: 'frost', name: 'Nord Frost', shortLabel: 'FROST', description: 'Arctic ice blue and cool grey Nord palette' },
    { id: 'cyber', name: 'Cyberpunk Charcoal', shortLabel: 'CYBER', description: 'High-energy neon yellow and cyan on charcoal' },
    { id: 'hi-contrast', name: 'High Contrast (WCAG AAA)', shortLabel: 'HI-CONTRAST', description: 'Stark yellow and white on pure black' },
    { id: 'emerald', name: 'Emerald Forest', shortLabel: 'EMERALD', description: 'Deep jade obsidian and glowing mint' },
    // Backward compatibility aliases
    { id: 'nord', name: 'Nord Frost', shortLabel: 'FROST', description: 'Arctic ice blue and cool grey Nord palette' },
    { id: 'cyberpunk', name: 'Cyberpunk Charcoal', shortLabel: 'CYBER', description: 'High-energy neon yellow and cyan on charcoal' },
    { id: 'high-contrast', name: 'High Contrast (WCAG AAA)', shortLabel: 'HI-CONTRAST', description: 'Stark yellow and white on pure black' },
  ];

  // Ordered sequence for sequential header toggle cycling
  private readonly cycleOrder: readonly AppTheme[] = [
    'oled',
    'dark',
    'light',
    'slate',
    'frost',
    'cyber',
    'hi-contrast',
    'emerald',
  ];

  // Reactive computed label guaranteeing short names for header button without layout shift
  public readonly currentThemeLabel = computed<string>(() => {
    const current = this.currentTheme();
    const found = this.availableThemes.find((t) => t.id === current);
    if (found) {
      return found.shortLabel;
    }
    return current.toUpperCase();
  });

  constructor() {
    // Restore from localStorage or default to dark
    const savedTheme = localStorage.getItem(this.THEME_KEY) as AppTheme | null;
    if (savedTheme && this.availableThemes.some((t) => t.id === savedTheme)) {
      this.currentTheme.set(savedTheme);
    }

    // Reactively apply data-theme attribute to root document
    effect(() => {
      const theme = this.currentTheme();
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(this.THEME_KEY, theme);
    });
  }

  public setTheme(theme: AppTheme): void {
    this.currentTheme.set(theme);
  }

  /**
   * Sequential cycling through all 8 themes in exact user order:
   * OLED -> DARK -> LIGHT -> SLATE -> FROST -> CYBER -> HI-CONTRAST -> EMERALD
   */
  public cycleTheme(): void {
    const current = this.currentTheme();
    // Normalize aliases to cycle indices
    let canonical: AppTheme = current;
    if (current === 'nord') canonical = 'frost';
    else if (current === 'cyberpunk') canonical = 'cyber';
    else if (current === 'high-contrast') canonical = 'hi-contrast';

    const currentIndex = this.cycleOrder.indexOf(canonical);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % this.cycleOrder.length : 0;
    this.currentTheme.set(this.cycleOrder[nextIndex]);
  }

  /**
   * Alias for cycleTheme to support existing button bindings and tests
   */
  public toggleTheme(): void {
    this.cycleTheme();
  }

  public cycleAllThemes(): void {
    this.cycleTheme();
  }
}
