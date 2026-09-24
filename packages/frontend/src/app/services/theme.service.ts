import { Injectable, signal, effect } from '@angular/core';

export type AppTheme =
  | 'dark'
  | 'light'
  | 'high-contrast'
  | 'nord'
  | 'oled'
  | 'cyberpunk';

export interface ThemeOption {
  readonly id: AppTheme;
  readonly name: string;
  readonly description: string;
}

/**
 * Service managing global curated theme states with Signals and localStorage persistence.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'cacophony-theme';
  public readonly currentTheme = signal<AppTheme>('dark');

  public readonly availableThemes: readonly ThemeOption[] = [
    { id: 'dark', name: 'Dark Slate', description: 'Obsidian deep slate default dark mode' },
    { id: 'light', name: 'Minimalist Light', description: 'Clean daylight aesthetic with sharp contrast' },
    { id: 'oled', name: 'OLED Pure Black', description: 'Zero emission #000000 true black dark theme' },
    { id: 'nord', name: 'Nord Frost', description: 'Arctic ice blue & cool grey Nord palette' },
    { id: 'cyberpunk', name: 'Cyberpunk Charcoal', description: 'High-energy neon yellow & cyan on charcoal' },
    { id: 'high-contrast', name: 'High Contrast (WCAG AAA)', description: 'Stark yellow and white on pure black' },
  ];

  constructor() {
    // Restore from localStorage or default to dark
    const savedTheme = localStorage.getItem(this.THEME_KEY) as AppTheme | null;
    if (savedTheme && this.availableThemes.some((t) => t.id === savedTheme)) {
      this.currentTheme.set(savedTheme);
    }

    // Reactively apply theme attribute to root document
    effect(() => {
      const theme = this.currentTheme();
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(this.THEME_KEY, theme);
    });
  }

  public setTheme(theme: AppTheme): void {
    this.currentTheme.set(theme);
  }

  public toggleTheme(): void {
    const current = this.currentTheme();
    if (current === 'dark') {
      this.currentTheme.set('light');
    } else if (current === 'light') {
      this.currentTheme.set('high-contrast');
    } else {
      this.currentTheme.set('dark');
    }
  }

  public cycleAllThemes(): void {
    const order: AppTheme[] = ['dark', 'light', 'oled', 'nord', 'cyberpunk', 'high-contrast'];
    const currentIndex = order.indexOf(this.currentTheme());
    const nextIndex = (currentIndex + 1) % order.length;
    this.currentTheme.set(order[nextIndex] ?? 'dark');
  }
}
