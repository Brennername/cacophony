import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcessInspectorComponent } from '../process-inspector/process-inspector.component';
import { ArenaStateStore } from '../../services/arena-state.store';

/**
 * Process Inspector route view:
 * Real-time monitoring of spawned non-model test runners, linters, git worktrees, and shell audits.
 */
@Component({
  selector: 'app-processes-view',
  standalone: true,
  imports: [CommonModule, ProcessInspectorComponent],
  template: `
    <div class="view-container">
      <div class="view-header">
        <div>
          <h1>Spawned Subprocess Monitor</h1>
          <p class="subtitle">Deterministic test loops, TypeScript compiler runs, linters, and git worktrees</p>
        </div>
        <div class="header-stat">
          <span class="stat-num">{{ store.processes().length }}</span>
          <span class="stat-label">Active & Recorded Runs</span>
        </div>
      </div>

      <div class="view-body">
        <app-process-inspector />
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

    .view-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
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

    .header-stat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .stat-num {
      font-family: var(--font-mono);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-brand);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
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
export class ProcessesViewComponent {
  public readonly store = inject(ArenaStateStore);
}
