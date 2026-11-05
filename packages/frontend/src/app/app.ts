import { Component, inject, signal, computed, viewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';
import { ArenaStateStore } from './services/arena-state.store';
import { FrontierModalComponent, DecomposedTaskPreview } from './components/frontier-modal/frontier-modal.component';
import { TaskDetailModalComponent } from './components/task-detail-modal/task-detail-modal.component';
import { SessionTabsComponent } from './components/session-tabs/session-tabs.component';
import { TelemetryBarComponent } from './components/telemetry-bar/telemetry-bar.component';
import { LoginModalComponent } from './components/login-modal/login-modal.component';
import { ThumbPadComponent } from './components/thumb-pad/thumb-pad.component';

/**
 * Root Application Component:
 * Features mobile-first responsive layout, slide-out hamburger navigation drawer,
 * generalized acrylic squircle thumb pad navigation for mobile profiles, desktop retained glassmorphism header,
 * and unconstrained touch-scroll viewports.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FrontierModalComponent,
    TaskDetailModalComponent,
    SessionTabsComponent,
    TelemetryBarComponent,
    LoginModalComponent,
    ThumbPadComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  public readonly themeService = inject(ThemeService);
  public readonly authService = inject(AuthService);
  public readonly store = inject(ArenaStateStore);
  public readonly router = inject(Router);

  public readonly activeRunningTestsCount = computed(() => {
    return this.store.processes().filter((p) => p.status === 'RUNNING').length;
  });

  public readonly frontierModal = viewChild(FrontierModalComponent);
  public readonly loginModal = viewChild(LoginModalComponent);
  public readonly drawerOpen = signal(false);
  public readonly isHeaderRetained = signal(false);

  /**
   * Tracks the last visited non-settings route so clicking the gear icon toggles back to it.
   */
  public readonly lastNonSettingsUrl = signal<string>('/models');

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects || event.url;
        if (!url.startsWith('/settings')) {
          this.lastNonSettingsUrl.set(url);
        }
      });
  }

  /**
   * Toggles system settings: if on /settings, returns to last used route; otherwise navigates to /settings.
   */
  public toggleSettings(): void {
    const currentUrl = this.router.url;
    if (currentUrl.startsWith('/settings')) {
      const fallback = this.lastNonSettingsUrl() || '/models';
      void this.router.navigateByUrl(fallback);
    } else {
      this.lastNonSettingsUrl.set(currentUrl);
      void this.router.navigateByUrl('/settings');
    }
  }

  @HostListener('window:scroll')
  public onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const isDesktop = window.innerWidth >= 1024;
      this.isHeaderRetained.set(isDesktop && scrollY > 20);
    }
  }

  public toggleMobileDrawer(): void {
    this.drawerOpen.set(!this.drawerOpen());
  }

  public closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  public openFrontierModal(): void {
    this.frontierModal()?.open();
  }

  public openLoginModal(): void {
    this.loginModal()?.open();
  }

  onTasksCommitted(tasks: DecomposedTaskPreview[]): void {
    console.log('Tasks committed:', tasks);
  }
}
