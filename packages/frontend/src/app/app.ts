import { Component, inject, signal, computed, viewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';
import { ArenaStateStore } from './services/arena-state.store';
import { FrontierModalComponent, DecomposedTaskPreview } from './components/frontier-modal/frontier-modal.component';
import { TaskDetailModalComponent } from './components/task-detail-modal/task-detail-modal.component';
import { SessionTabsComponent } from './components/session-tabs/session-tabs.component';
import { TelemetryBarComponent } from './components/telemetry-bar/telemetry-bar.component';
import { LoginModalComponent } from './components/login-modal/login-modal.component';

/**
 * Root Application Component:
 * Features mobile-first responsive layout, slide-out hamburger navigation drawer,
 * acrylic squircle floating footer for mobile profiles, desktop retained glassmorphism header,
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
