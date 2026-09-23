import { Component, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';
import { ArenaStateStore } from './services/arena-state.store';
import { HardwareMonitorComponent } from './components/hardware-monitor/hardware-monitor.component';
import { TaskInspectorComponent } from './components/task-inspector/task-inspector.component';
import { QueueManagerComponent } from './components/queue-manager/queue-manager.component';
import { TaskHistoryComponent } from './components/task-history/task-history.component';
import { ProcessInspectorComponent } from './components/process-inspector/process-inspector.component';
import { FrontierModalComponent, DecomposedTaskPreview } from './components/frontier-modal/frontier-modal.component';
import { SessionTabsComponent } from './components/session-tabs/session-tabs.component';
import { ExecutionModeSelectorComponent } from './components/execution-mode-selector/execution-mode-selector.component';
import { RepoMapViewerComponent } from './components/repo-map-viewer/repo-map-viewer.component';
import { CheckpointTimelineComponent } from './components/checkpoint-timeline/checkpoint-timeline.component';
import { LspTestLoopPanelComponent } from './components/lsp-test-loop-panel/lsp-test-loop-panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HardwareMonitorComponent,
    TaskInspectorComponent,
    QueueManagerComponent,
    TaskHistoryComponent,
    ProcessInspectorComponent,
    FrontierModalComponent,
    SessionTabsComponent,
    ExecutionModeSelectorComponent,
    RepoMapViewerComponent,
    CheckpointTimelineComponent,
    LspTestLoopPanelComponent,
  ],
  template: `
    <div class="app-container">
      <!-- Navbar / Top Header -->
      <header class="top-nav">
        <div class="brand-group">
          <div class="brand-logo">CACOPHONY</div>
          <span class="arena-tag">Local Model Arena</span>
        </div>

        <div class="controls-group">
          <!-- Dynamic Enterprise SSO Login / User Status -->
          @if (authService.session().isAuthenticated) {
            <span class="user-pill">{{ authService.session().username }} ({{ authService.session().provider || 'SSO' }})</span>
          } @else {
            <button class="btn btn-outline" (click)="authService.login()">
              Login with {{ authService.activeProvider() | uppercase }}
            </button>
          }

          <!-- Decompose Modal Trigger -->
          <button class="btn btn-outline" (click)="openFrontierModal()">
            Decompose Feature
          </button>

          <!-- Theme Toggle Button -->
          <button class="btn btn-outline theme-toggle" (click)="themeService.toggleTheme()">
            Theme: {{ themeService.currentTheme() | uppercase }}
          </button>
        </div>
      </header>

      <router-outlet></router-outlet>

      <!-- Session Tabs and Safety Mode Segmented Controller -->
      <div class="session-control-bar">
        <app-session-tabs />
        <app-execution-mode-selector />
      </div>

      <!-- Main Responsive Content Grid -->
      <main class="content-grid">
        <!-- Hardware Diagnostics (Full Width on mobile, 1 col on desktop) -->
        <section class="grid-section">
          <app-hardware-monitor />
        </section>

        <!-- Active Task Stepper & Terminal -->
        <section class="grid-section">
          <app-task-inspector />
        </section>

        <!-- Repository Map Visualizer -->
        <section class="grid-section">
          <app-repo-map-viewer />
        </section>

        <!-- LSP Diagnostics & Automated Test Loop -->
        <section class="grid-section">
          <app-lsp-test-loop-panel />
        </section>

        <!-- Queue Management -->
        <section class="grid-section">
          <app-queue-manager />
        </section>

        <!-- Task History & Model Leaderboard -->
        <section class="grid-section">
          <app-task-history />
        </section>

        <!-- Git Checkpoint Shadow Timeline -->
        <section class="grid-section">
          <app-checkpoint-timeline />
        </section>

        <!-- Spawned Processes & Non-Model Tests -->
        <section class="grid-section full-width">
          <app-process-inspector />
        </section>
      </main>

      <!-- Frontier Decomposition Modal -->
      <app-frontier-modal #frontierModal (committed)="onTasksCommitted($event)" />
    </div>
  `,
  styles: [`
    .top-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 1rem;
    }

    .session-control-bar {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    @media (min-width: 768px) {
      .session-control-bar {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }
    }

    .brand-group {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
    }

    .brand-logo {
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: var(--color-brand);
      text-transform: uppercase;
    }

    .arena-tag {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .controls-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .theme-toggle {
      font-family: var(--font-mono);
      font-size: 0.75rem;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }

    @media (min-width: 1024px) {
      .content-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .content-grid .full-width {
        grid-column: span 2;
      }
    }
  `],
})
export class AppComponent {
  public readonly themeService = inject(ThemeService);
  public readonly authService = inject(AuthService);
  private readonly store = inject(ArenaStateStore);

  public readonly frontierModal = viewChild(FrontierModalComponent);

  public openFrontierModal(): void {
    this.frontierModal()?.open();
  }

  public onTasksCommitted(tasks: DecomposedTaskPreview[]): void {
    for (const t of tasks) {
      this.store.addTask(t.title, t.priority);
    }
  }
}
