import { Component, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';
import { ArenaStateStore } from './services/arena-state.store';
import { FrontierModalComponent, DecomposedTaskPreview } from './components/frontier-modal/frontier-modal.component';
import { TaskDetailModalComponent } from './components/task-detail-modal/task-detail-modal.component';
import { SessionTabsComponent } from './components/session-tabs/session-tabs.component';
import { ExecutionModeSelectorComponent } from './components/execution-mode-selector/execution-mode-selector.component';

/**
 * Root Application Component:
 * Features mobile-first responsive layout, slide-out hamburger navigation drawer,
 * bottom navigation bar for handheld viewports (< 768px), high-density desktop navigation,
 * and routed child outlets.
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
    ExecutionModeSelectorComponent,
  ],
  template: `
    <div class="app-layout">
      <!-- Top Navigation Header -->
      <header class="top-nav">
        <div class="brand-group">
          <!-- Mobile Hamburger Toggle -->
          <button
            class="mobile-menu-btn"
            (click)="toggleMobileDrawer()"
            aria-label="Toggle navigation drawer"
          >
            <span class="hamburger-bar"></span>
            <span class="hamburger-bar"></span>
            <span class="hamburger-bar"></span>
          </button>

          <a routerLink="/dashboard" class="brand-link">
            <span class="brand-logo">CACOPHONY</span>
            <span class="arena-tag">Local Model Arena</span>
          </a>
        </div>

        <!-- Desktop Navigation Links -->
        <nav class="desktop-nav" aria-label="Desktop primary navigation">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">Dashboard</a>
          <a routerLink="/queue" routerLinkActive="active" class="nav-link">Queue</a>
          <a routerLink="/history" routerLinkActive="active" class="nav-link">History</a>
          <a routerLink="/models" routerLinkActive="active" class="nav-link">Models</a>
          <a routerLink="/repomap" routerLinkActive="active" class="nav-link">Repo Map</a>
          <a routerLink="/processes" routerLinkActive="active" class="nav-link">Processes</a>
          <a routerLink="/fleet" routerLinkActive="active" class="nav-link">Fleet</a>
          <a routerLink="/settings" routerLinkActive="active" class="nav-link">Settings</a>
        </nav>

        <!-- Right Side Header Controls -->
        <div class="controls-group">
          @if (authService.session().isAuthenticated) {
            <span class="user-pill">{{ authService.session().username }}</span>
          } @else {
            <button class="btn btn-outline nav-auth-btn" (click)="authService.login()">
              Sign In
            </button>
          }

          <button class="btn btn-outline decompose-btn" (click)="openFrontierModal()">
            Decompose
          </button>

          <button
            class="btn btn-outline theme-toggle"
            (click)="themeService.toggleTheme()"
            aria-label="Toggle color theme"
          >
            {{ themeService.currentTheme() | uppercase }}
          </button>
        </div>
      </header>

      <!-- Mobile Drawer Backdrop & Slide-out Menu -->
      @if (drawerOpen()) {
        <div
          class="drawer-backdrop"
          (click)="closeDrawer()"
          role="presentation"
        ></div>
      }
      <aside
        class="mobile-drawer"
        [class.open]="drawerOpen()"
        aria-label="Mobile navigation drawer"
      >
        <div class="drawer-header">
          <span class="drawer-title">Navigation Menu</span>
          <button
            class="drawer-close-btn"
            (click)="closeDrawer()"
            aria-label="Close navigation drawer"
          >
            ✕
          </button>
        </div>

        <nav class="drawer-nav">
          <a routerLink="/dashboard" routerLinkActive="active" (click)="closeDrawer()" class="drawer-link">
            Dashboard
          </a>
          <a routerLink="/queue" routerLinkActive="active" (click)="closeDrawer()" class="drawer-link">
            Queue Management
          </a>
          <a routerLink="/history" routerLinkActive="active" (click)="closeDrawer()" class="drawer-link">
            Task History & Checkpoints
          </a>
          <a routerLink="/models" routerLinkActive="active" (click)="closeDrawer()" class="drawer-link">
            Model Leaderboard
          </a>
          <a routerLink="/repomap" routerLinkActive="active" (click)="closeDrawer()" class="drawer-link">
            Repo Architecture
          </a>
          <a routerLink="/processes" routerLinkActive="active" (click)="closeDrawer()" class="drawer-link">
            Spawned Processes
          </a>
          <a routerLink="/fleet" routerLinkActive="active" (click)="closeDrawer()" class="drawer-link">
            Fleet Accelerators
          </a>
          <a routerLink="/settings" routerLinkActive="active" (click)="closeDrawer()" class="drawer-link">
            System Settings
          </a>
        </nav>

        <div class="drawer-footer">
          <button class="btn btn-primary w-full" (click)="openFrontierModal(); closeDrawer()">
            Decompose Feature
          </button>
        </div>
      </aside>

      <!-- Session Control Bar (Tabs & Safety Mode) -->
      <div class="session-control-bar">
        <app-session-tabs />
        <app-execution-mode-selector />
      </div>

      <!-- Main Routed View Outlet -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <!-- Mobile Bottom Navigation Bar (< 768px) with WCAG > 48px Tap Targets -->
      <nav class="mobile-bottom-nav" aria-label="Mobile bottom navigation">
        <a routerLink="/dashboard" routerLinkActive="active" class="bottom-tab">
          <span class="tab-label">Home</span>
        </a>
        <a routerLink="/queue" routerLinkActive="active" class="bottom-tab">
          <span class="tab-label">Queue</span>
        </a>
        <a routerLink="/history" routerLinkActive="active" class="bottom-tab">
          <span class="tab-label">History</span>
        </a>
        <a routerLink="/models" routerLinkActive="active" class="bottom-tab">
          <span class="tab-label">Models</span>
        </a>
        <button class="bottom-tab more-tab" (click)="toggleMobileDrawer()">
          <span class="tab-label">More</span>
        </button>
      </nav>

      <!-- Frontier Decomposition Modal -->
      <app-frontier-modal #frontierModal (committed)="onTasksCommitted($event)" />

      <!-- Deep Task Drill-Down Dialog -->
      <app-task-detail-modal />
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      width: 100%;
      max-width: 1440px;
      margin: 0 auto;
      padding: 0.75rem;
      padding-bottom: 5rem; /* Space for mobile bottom nav */
      box-sizing: border-box;
      overflow-x: hidden;
    }

    @media (min-width: 768px) {
      .app-layout {
        padding: 1.5rem;
        padding-bottom: 2rem;
      }
    }

    .top-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 1rem;
      position: sticky;
      top: 0;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      background: var(--bg-primary);
      z-index: 40;
    }

    .main-content {
      flex: 1;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
      flex-shrink: 1;
    }

    .brand-link {
      display: flex;
      align-items: baseline;
      gap: 0.35rem;
      text-decoration: none;
      min-width: 0;
    }

    .brand-logo {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: var(--color-brand);
      text-transform: uppercase;
      white-space: nowrap;
    }

    .arena-tag {
      display: none;
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    @media (min-width: 480px) {
      .arena-tag {
        display: inline-block;
      }
    }

    .mobile-menu-btn {
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      width: 44px;
      height: 44px;
      background: transparent;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 10px;
      cursor: pointer;
    }

    .hamburger-bar {
      width: 100%;
      height: 2px;
      background: var(--text-primary);
      border-radius: 2px;
    }

    @media (min-width: 768px) {
      .mobile-menu-btn {
        display: none;
      }
    }

    /* Desktop Navigation */
    .desktop-nav {
      display: none;
      align-items: center;
      gap: 0.25rem;
    }

    @media (min-width: 768px) {
      .desktop-nav {
        display: flex;
      }
    }

    .nav-link {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm);
      transition: all 0.15s ease;
    }

    .nav-link:hover {
      color: var(--text-primary);
      background: var(--bg-surface-elevated);
    }

    .nav-link.active {
      color: var(--color-brand);
      background: var(--bg-surface-elevated);
      font-weight: 600;
    }

    .controls-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .user-pill {
      font-size: 0.75rem;
      font-family: var(--font-mono);
      padding: 0.35rem 0.65rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      color: var(--color-brand);
    }

    .theme-toggle {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      padding: 0.4rem 0.6rem;
    }

    .decompose-btn {
      display: none;
    }

    @media (min-width: 640px) {
      .decompose-btn {
        display: inline-flex;
      }
    }

    /* Session Control Bar */
    .session-control-bar {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }

    @media (min-width: 768px) {
      .session-control-bar {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }
    }

    .session-control-bar > * {
      min-width: 0;
      max-width: 100%;
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* Mobile Drawer */
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 90;
    }

    .mobile-drawer {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 280px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-subtle);
      z-index: 100;
      display: flex;
      flex-direction: column;
      transform: translateX(-100%);
      transition: transform 0.25s ease-in-out;
      padding: 1.25rem;
      gap: 1.5rem;
    }

    .mobile-drawer.open {
      transform: translateX(0);
    }

    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-subtle);
    }

    .drawer-title {
      font-weight: 700;
      font-size: 1.125rem;
      color: var(--text-primary);
    }

    .drawer-close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .drawer-nav {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1;
    }

    .drawer-link {
      display: flex;
      align-items: center;
      min-height: 48px;
      padding: 0.75rem 1rem;
      color: var(--text-primary);
      text-decoration: none;
      font-weight: 500;
      border-radius: var(--radius-sm);
      transition: background 0.15s ease;
    }

    .drawer-link:hover, .drawer-link.active {
      background: var(--bg-surface-elevated);
      color: var(--color-brand);
    }

    .drawer-footer {
      padding-top: 1rem;
      border-top: 1px solid var(--border-subtle);
    }

    .w-full {
      width: 100%;
    }

    /* Mobile Bottom Navigation Bar */
    .mobile-bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: var(--bg-glass);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-top: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-around;
      align-items: center;
      z-index: 50;
    }

    @media (min-width: 768px) {
      .mobile-bottom-nav {
        display: none;
      }
    }

    .bottom-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      height: 100%;
      min-height: 48px;
      color: var(--text-muted);
      text-decoration: none;
      background: transparent;
      border: none;
      cursor: pointer;
      font-family: var(--font-sans);
    }

    .bottom-tab.active {
      color: var(--color-brand);
      font-weight: 600;
    }

    .tab-label {
      font-size: 0.75rem;
    }
  `],
})
export class AppComponent {
  public readonly themeService = inject(ThemeService);
  public readonly authService = inject(AuthService);
  private readonly store = inject(ArenaStateStore);

  public readonly frontierModal = viewChild(FrontierModalComponent);
  public readonly drawerOpen = signal<boolean>(false);

  public toggleMobileDrawer(): void {
    this.drawerOpen.update((open) => !open);
  }

  public closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  public openFrontierModal(): void {
    this.frontierModal()?.open();
  }

  public onTasksCommitted(tasks: DecomposedTaskPreview[]): void {
    for (const t of tasks) {
      this.store.addTask(t.title, t.priority);
    }
  }
}
