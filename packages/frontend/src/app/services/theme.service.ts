import { Injectable, signal, effect } from '@angular/core';

export type AppTheme = 'dark' | 'light' | 'high-contrast';

/**
 * Service managing global theme state with Signals and localStorage persistence.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'cacophony-theme';
  public readonly currentTheme = signal<AppTheme>('dark');

  constructor() {
    // Restore from localStorage or default to dark
    const savedTheme = localStorage.getItem(this.THEME_KEY) as AppTheme | null;
    if (savedTheme && ['dark', 'light', 'high-contrast'].includes(savedTheme)) {
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
}
