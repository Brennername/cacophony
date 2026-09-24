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

  it('should toggle between core themes sequentially', () => {
    service.setTheme('dark');
    service.toggleTheme();
    expect(service.currentTheme()).toBe('light');

    service.toggleTheme();
    expect(service.currentTheme()).toBe('high-contrast');

    service.toggleTheme();
    expect(service.currentTheme()).toBe('dark');
  });
});
