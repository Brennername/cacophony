import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SettingsViewComponent } from './settings-view.component';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

describe('SettingsViewComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SettingsViewComponent],
      providers: [ThemeService, AuthService],
    });
  });

  it('should render SettingsViewComponent and toggle themes', () => {
    const fixture = TestBed.createComponent(SettingsViewComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.themeService.currentTheme()).toBe('dark');
    comp.themeService.setTheme('high-contrast');
    expect(comp.themeService.currentTheme()).toBe('high-contrast');
    comp.themeService.setTheme('dark');
  });

  it('should display available themes from ThemeService', () => {
    const fixture = TestBed.createComponent(SettingsViewComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const themeButtons = compiled.querySelectorAll('.theme-btn');
    expect(themeButtons.length).toBeGreaterThanOrEqual(6);
  });
});
