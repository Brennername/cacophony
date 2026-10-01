import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HardwareMonitorComponent } from '../hardware-monitor/hardware-monitor.component';
import { TaskInspectorComponent } from '../task-inspector/task-inspector.component';
import { QueueManagerComponent } from '../queue-manager/queue-manager.component';
import { SuccessMeterComponent } from '../success-meter/success-meter.component'; // Import the SuccessMeterComponent
import { ArenaStateStore } from '../../services/arena-state.store';

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [
    CommonModule,
    HardwareMonitorComponent,
    TaskInspectorComponent,
    QueueManagerComponent,
    SuccessMeterComponent, // Add SuccessMeterComponent to the imports
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

      <!-- Success Meter Component adjacent to Active Task Inspector -->
      <section class="grid-card-wrapper">
        <app-success-meter /> <!-- Add the SuccessMeterComponent here -->
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      grid-auto-flow: dense;
      gap: 1.25rem;
      align-items: stretch;
      min-width: 0;
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
    }

    @media (min-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .full-width {
        grid-column: span 3;
      }
    }

    .grid-card-wrapper {
      display: flex;
      flex-direction: column;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }

    .grid-card-wrapper > * {
      flex: 1;
      height: 100%;
      min-width: 0;
      max-width: 100%;
    }
  `],
})
export class DashboardViewComponent implements OnInit {
  public readonly store = inject(ArenaStateStore);
  private readonly route = inject(ActivatedRoute);

  public ngOnInit(): void {
    const taskId = this.route.snapshot.paramMap.get('id');
    if (taskId) {
      void this.store.selectTask(taskId);
    }
  }
}