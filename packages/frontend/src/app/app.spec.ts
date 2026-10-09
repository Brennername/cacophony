import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.js';
import { routes } from './app.routes';
import { ThemeService } from './services/theme.service';
import { ArenaStateStore } from './services/arena-state.store';

describe('Angular Standalone Dashboard Component Tests', () => {
  it('should initialize AppComponent with mobile-first layout and reactive signals', () => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [ThemeService, ArenaStateStore, provideRouter(routes)],
    });

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-logo')?.textContent).toContain('CACOPHONY');
    expect(compiled.querySelector('.arena-tag')?.textContent).toContain('Local Model Arena');

    expect(app.drawerOpen()).toBe(false);
    app.toggleMobileDrawer();
    expect(app.drawerOpen()).toBe(true);
    app.closeDrawer();
    expect(app.drawerOpen()).toBe(false);
  });

  it('should toggle theme and update signal state', () => {
    TestBed.configureTestingModule({
      providers: [ThemeService],
    });

    const themeService = TestBed.inject(ThemeService);
    expect(themeService.currentTheme()).toBe('dark');

    themeService.toggleTheme();
    expect(themeService.currentTheme()).toBe('light');

    themeService.toggleTheme();
    expect(themeService.currentTheme()).toBe('high-contrast');

    themeService.toggleTheme();
    expect(themeService.currentTheme()).toBe('dark');
  });

  it('should track and reorder task priorities with ArenaStateStore', () => {
    TestBed.configureTestingModule({
      providers: [ArenaStateStore],
    });

    const store = TestBed.inject(ArenaStateStore);
    store.addTask('Task A', 'P1');
    store.addTask('Task B', 'P1');
    store.addTask('Task C', 'P2');
    expect(store.tasks().length).toBeGreaterThanOrEqual(3);

    const firstTaskId = store.tasks()[0]!.id;
    const secondTaskId = store.tasks()[1]!.id;

    store.moveTaskPriority(firstTaskId, 'down');
    expect(store.tasks()[1]!.id).toBe(firstTaskId);
    expect(store.tasks()[0]!.id).toBe(secondTaskId);

    store.addTask('New high-priority unit', 'P0');
    expect(store.tasks()[0]!.title).toBe('New high-priority unit');
    expect(store.tasks()[0]!.priority).toBe('P0');
  });
});