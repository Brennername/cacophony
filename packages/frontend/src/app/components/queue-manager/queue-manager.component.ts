import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ArenaStateStore } from '../../services/arena-state.store';

/**
 * Queue Management component providing task re-ordering, priority tagging,
 * scheduler daemon lifecycle controls (pause/resume), and task enqueue form.
 */
@Component({
  selector: 'app-queue-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cacophony-card queue-card">
      <div class="card-header">
        <div>
          <h2>Task Queue & Scheduling</h2>
          <span class="subtext">{{ pendingCount() }} tasks pending</span>
          <span class="role-pill">{{ currentUserRole() }}</span>
        </div>
        <div class="actions" *ngIf="canMutateTasks()">
          <button
            class="btn"
            [ngClass]="schedulerPaused() ? 'btn-primary' : 'btn-outline'"
            (click)="toggleScheduler()"
          >
            {{ schedulerPaused() ? 'Resume Scheduler' : 'Pause Scheduler' }}
          </button>
        </div>
      </div>

      <!-- Add Task Form (Restricted to OPERATOR and ADMIN) -->
      <form class="add-form" *ngIf="canMutateTasks()" (ngSubmit)="submitTask()">
        <input
          type="text"
          class="input-title"
          placeholder="New task title or directive..."
          [value]="newTitle()"
          (input)="newTitle.set($any($event.target).value)"
        />
        <select
          class="select-priority"
          [value]="newPriority()"
          (change)="newPriority.set($any($event.target).value)"
        >
          <option value="P0">P0 (Urgent)</option>
          <option value="P1">P1 (Normal)</option>
          <option value="P2">P2 (Low)</option>
        </select>
        <button type="submit" class="btn btn-primary">Enqueue</button>
      </form>

      <!-- Task List -->
      <div class="task-list">
        @for (task of tasks(); track task.id; let idx = $index) {
          <div class="task-row clickable" (click)="drillDown(task)">
            <div class="priority-col">
              <span class="tag" [ngClass]="task.priority">{{ task.priority }}</span>
            </div>
            <div class="info-col">
              <span class="title">{{ task.title }}</span>
              <div class="meta-row">
                <span class="role-badge">{{ task.role }}</span>
                <span class="model-tag font-mono">{{ task.modelAssigned || 'Auto' }}</span>
              </div>
            </div>
            <div class="status-col">
              <span class="status-pill" [ngClass]="task.status.toLowerCase()">
                {{ task.status }}
              </span>
            </div>
            <div class="order-col">
              <button
                class="icon-btn"
                [disabled]="idx === 0"
                (click)="move(task.id, 'up')"
              >
                ▲
              </button>
              <button
                class="icon-btn"
                [disabled]="idx === tasks().length - 1"
                (click)="move(task.id, 'down')"
              >
                ▼
              </button>
            </div>
          </div>
        }
      </div>
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

    .queue-card {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .subtext {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .role-pill {
      display: inline-block;
      margin-left: 0.5rem;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      background: var(--color-brand);
      color: var(--color-brand-contrast);
    }

    .add-form {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      min-width: 0;
      max-width: 100%;
    }

    .input-title {
      flex: 1 1 140px;
      min-width: 0;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface-elevated);
      color: var(--text-primary);
      font-family: var(--font-sans);
    }

    .select-priority {
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface-elevated);
      color: var(--text-primary);
      font-family: var(--font-sans);
    }

    .task-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-width: 0;
      max-width: 100%;
    }

    .task-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.875rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }

    .tag {
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 700;
    }
    .tag.P0 { background: #ef4444; color: #fff; }
    .tag.P1 { background: #f59e0b; color: #fff; }
    .tag.P2 { background: #64748b; color: #fff; }

    .info-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
    }

    .info-col .title {
      font-size: 0.875rem;
      font-weight: 500;
      min-width: 0;
      word-break: break-word;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .role-badge {
      font-size: 0.6875rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .model-tag {
      font-size: 0.625rem;
      color: var(--color-accent);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 3px;
      padding: 0.05rem 0.35rem;
    }

    .status-pill {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-full);
      text-transform: uppercase;
    }

    .status-pill.running { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    .status-pill.pending { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .status-pill.completed { background: rgba(16, 185, 129, 0.2); color: #34d399; }

    .order-col {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .icon-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.625rem;
      padding: 0.125rem 0.25rem;
    }

    .icon-btn:hover:not(:disabled) {
      color: var(--text-primary);
    }

    .task-row.clickable {
      cursor: pointer;
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }

    .task-row.clickable:hover {
      background: var(--bg-surface);
      border-color: var(--color-brand);
    }

    .icon-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  `],
})
export class QueueManagerComponent {
  private readonly store = inject(ArenaStateStore);
  public readonly tasks = this.store.tasks;
  public readonly pendingCount = this.store.pendingCount;
  public readonly schedulerPaused = this.store.schedulerPaused;
  public readonly canMutateTasks = this.store.canMutateTasks;
  public readonly currentUserRole = this.store.currentUserRole;

  public newTitle = signal<string>('');
  public newPriority = signal<'P0' | 'P1' | 'P2'>('P1');

  public drillDown(task: any): void {
    void this.store.selectTask(task);
  }

  public toggleScheduler(): void {
    this.store.toggleScheduler();
  }

  public move(taskId: string, direction: 'up' | 'down'): void {
    this.store.moveTaskPriority(taskId, direction);
  }

  public submitTask(): void {
    const title = this.newTitle().trim();
    if (!title) return;
    this.store.addTask(title, this.newPriority());
    this.newTitle.set('');
  }
}
