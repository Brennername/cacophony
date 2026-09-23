import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HardwareMonitorComponent } from '../hardware-monitor/hardware-monitor.component';
import { TaskInspectorComponent } from '../task-inspector/task-inspector.component';
import { QueueManagerComponent } from '../queue-manager/queue-manager.component';
import { ArenaStateStore } from '../../services/arena-state.store';

/**
 * Dashboard Overview route view:
 * Shows hardware diagnostics, active task inspector, and compact queue snapshot.
 * Designed with a high-density, gap-free CSS grid layout.
 */
@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [
    CommonModule,
    HardwareMonitorComponent,
    TaskInspectorComponent,
    QueueManagerComponent,
  ],
  template: `
    <div class="dashboard-grid">
      <!-- Hardware Telemetry Diagnostics -->
      <section class="grid-card-wrapper">
        <app-hardware-monitor />
      </section>

      <!-- Active Running Task Stepper & Log Stream -->
      <section class="grid-card-wrapper">
        <app-task-inspector />
      </section>

      <!-- Compact Queue Snapshot -->
      <section class="grid-card-wrapper full-width">
        <app-queue-manager />
      </section>
    </div>
  `,
  styles: [`
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr;
      grid-auto-flow: dense;
      gap: 1.25rem;
      align-items: stretch;
    }

    @media (min-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .full-width {
        grid-column: span 2;
      }
    }

    .grid-card-wrapper {
      display: flex;
      flex-direction: column;
    }

    .grid-card-wrapper > * {
      flex: 1;
      height: 100%;
    }
  `],
})
export class DashboardViewComponent {
  public readonly store = inject(ArenaStateStore);
}
