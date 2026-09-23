import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueueManagerComponent } from '../queue-manager/queue-manager.component';

/**
 * Dedicated Task Queue Management route view:
 * Full task queue management, drag-and-drop reordering, priority filters, and enqueue drawer.
 */
@Component({
  selector: 'app-queue-view',
  standalone: true,
  imports: [CommonModule, QueueManagerComponent],
  template: `
    <div class="view-container">
      <div class="view-header">
        <h1>Task Queue & Dispatch Scheduler</h1>
        <p class="subtitle">Inspect, prioritize, re-order, and inject arena instructions</p>
      </div>
      <div class="view-body">
        <app-queue-manager />
      </div>
    </div>
  `,
  styles: [`
    .view-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-height: 100%;
    }

    .view-header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .view-body {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .view-body > * {
      flex: 1;
    }
  `],
})
export class QueueViewComponent {}
