import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [ThemeService],
    });
    service = TestBed.inject(ThemeService);
  });

  it('should initialize with default dark theme or stored theme', () => {
    expect(service.currentTheme()).toBe('dark');
  });

  it('should support curated theme cycling and palette options', () => {
    expect(service.availableThemes.length).toBeGreaterThanOrEqual(6);
    expect(service.availableThemes.some((t) => t.id === 'oled')).toBe(true);
    expect(service.availableThemes.some((t) => t.id === 'nord')).toBe(true);
    expect(service.availableThemes.some((t) => t.id === 'cyberpunk')).toBe(true);

    service.setTheme('nord');
    expect(service.currentTheme()).toBe('nord');

    service.setTheme('cyberpunk');
    expect(service.currentTheme()).toBe('cyberpunk');

    service.setTheme('oled');
    expect(service.currentTheme()).toBe('oled');
  });

  it('should toggle and cycle through all 8 curated themes sequentially', () => {
    service.setTheme('oled');
    expect(service.currentThemeLabel()).toBe('OLED');

    service.cycleTheme();
    expect(service.currentTheme()).toBe('dark');
    expect(service.currentThemeLabel()).toBe('DARK');

    service.cycleTheme();
    expect(service.currentTheme()).toBe('light');
    expect(service.currentThemeLabel()).toBe('LIGHT');

    service.cycleTheme();
    expect(service.currentTheme()).toBe('slate');
    expect(service.currentThemeLabel()).toBe('SLATE');

    service.cycleTheme();
    expect(service.currentTheme()).toBe('frost');
    expect(service.currentThemeLabel()).toBe('FROST');

    service.cycleTheme();
    expect(service.currentTheme()).toBe('cyber');
    expect(service.currentThemeLabel()).toBe('CYBER');

    service.cycleTheme();
    expect(service.currentTheme()).toBe('hi-contrast');
    expect(service.currentThemeLabel()).toBe('HI-CONTRAST');

    service.cycleTheme();
    expect(service.currentTheme()).toBe('emerald');
    expect(service.currentThemeLabel()).toBe('EMERALD');

    service.cycleTheme();
    expect(service.currentTheme()).toBe('oled');
  });
});
