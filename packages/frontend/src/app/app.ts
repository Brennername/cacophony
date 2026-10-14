import { Component, inject, signal, computed, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';
import { ArenaStateStore } from './services/arena-state.store';
import { FrontierModalComponent, DecomposedTaskPreview } from './components/frontier-modal/frontier-modal.component';
import { TaskDetailModalComponent } from './components/task-detail-modal/task-detail-modal.component';
import { SessionTabsComponent } from './components/session-tabs/session-tabs.component';
import { ExecutionModeSelectorComponent } from './components/execution-mode-selector/execution-mode-selector.component';
import { TelemetryBarComponent } from './components/telemetry-bar/telemetry-bar.component';

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
    TelemetryBarComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  public readonly themeService = inject(ThemeService);
  public readonly authService = inject(AuthService);
  public readonly store = inject(ArenaStateStore);

  public readonly activeRunningTestsCount = computed(() => {
    return this.store.processes().filter((p) => p.status === 'RUNNING').length;
  });

  public readonly frontierModal = viewChild(FrontierModalComponent);
  drawerOpen = signal(false);

  toggleMobileDrawer() {
    this.drawerOpen.set(!this.drawerOpen());
  }

  public closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  public openFrontierModal(): void {
    this.frontierModal()?.open();
  }

  onTasksCommitted(tasks: DecomposedTaskPreview[]): void {
    // Implement logic to update the tasks and display a notification or update UI
    console.log('Tasks committed:', tasks);
  }
}
