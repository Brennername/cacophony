import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArenaStateStore } from '../../services/arena-state.store';

/**
 * Test Runner and Process Inspector displaying non-model spawned operations
 * (unit tests, linters, git worktree operations) with duration, exit codes, and status.
 */
@Component({
  selector: 'app-process-inspector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cacophony-card process-card">
      <div class="header">
        <div>
          <h2>Spawned Process Inspector</h2>
          <span class="subtext">Non-model test runners, linters, builds, and git worktrees</span>
        </div>
      </div>

      <div class="table-container">
        <table class="process-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Command</th>
              <th>Duration</th>
              <th>Exit Code</th>
            </tr>
          </thead>
          <tbody>
            @for (proc of processes(); track proc.id) {
              <tr>
                <td>
                  <span class="status-indicator" [ngClass]="proc.status.toLowerCase()">
                    {{ proc.status }}
                  </span>
                </td>
                <td class="command-cell">
                  <code>{{ proc.command }}</code>
                </td>
                <td class="num-cell">{{ proc.durationMs }}ms</td>
                <td class="num-cell">
                  <span class="exit-badge" [ngClass]="proc.exitCode === 0 ? 'ok' : 'err'">
                    {{ proc.exitCode ?? '...' }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .process-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .subtext {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .table-container {
      overflow-x: auto;
    }

    .process-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }

    .process-table th {
      text-align: left;
      padding: 0.5rem 0.75rem;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-subtle);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .process-table td {
      padding: 0.625rem 0.75rem;
      border-bottom: 1px solid var(--border-subtle);
    }

    .command-cell code {
      font-family: var(--font-mono);
      color: var(--text-primary);
      background: var(--bg-surface-elevated);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      word-break: break-all;
    }

    .num-cell {
      font-family: var(--font-mono);
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .status-indicator {
      display: inline-block;
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-full);
      text-transform: uppercase;
    }

    .status-indicator.success { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .status-indicator.running { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    .status-indicator.failed { background: rgba(239, 68, 68, 0.2); color: #f87171; }

    .exit-badge {
      font-weight: 700;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
    }

    .exit-badge.ok { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .exit-badge.err { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
  `],
})
export class ProcessInspectorComponent {
  private readonly store = inject(ArenaStateStore);
  public readonly processes = this.store.processes;
}
