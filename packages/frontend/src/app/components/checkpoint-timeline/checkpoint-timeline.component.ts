import { Component, Input, Output, EventEmitter, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CheckpointRecord {
  readonly id: string;
  readonly hash?: string;
  readonly message?: string;
  readonly text?: string;
  readonly createdAt?: string;
  readonly filesChanged?: number;
}

@Component({
  selector: 'app-checkpoint-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="checkpoint-timeline-container">
      <div class="timeline-header">
        <span class="timeline-title">Git Shadow Checkpoints</span>
        <div class="actions-group">
          <button
            class="action-btn undo-btn"
            [disabled]="!canUndo"
            (click)="triggerUndo()"
            aria-label="Undo to previous checkpoint"
          >
            ↺ Undo
          </button>
          <button
            class="action-btn redo-btn"
            [disabled]="!canRedo"
            (click)="triggerRedo()"
            aria-label="Redo to next checkpoint"
          >
            ↻ Redo
          </button>
        </div>
      </div>

      <div class="checkpoints-list">
        @for (cp of checkpoints; track cp.id; let idx = $index) {
          <div
            class="checkpoint-row"
            [class.active]="activeCheckpointId() === cp.id"
            (click)="selectCheckpoint(cp.id)"
            role="button"
            tabindex="0"
          >
            <div class="checkpoint-bullet"></div>
            <div class="checkpoint-info">
              <span class="checkpoint-hash">{{ (cp.hash || cp.id).slice(0, 7) }}</span>
              <span class="checkpoint-msg">{{ cp.message || cp.text }}</span>
              <span class="checkpoint-meta">{{ cp.filesChanged ?? 1 }} files • {{ cp.createdAt || 'Just now' }}</span>
            </div>
          </div>
        } @empty {
          <div class="empty-state">No git shadow checkpoints recorded yet.</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .checkpoint-timeline-container {
      display: flex;
      flex-direction: column;
      background: var(--bg-surface, #1e1e24);
      border-radius: 6px;
      border: 1px solid var(--border-color, #2d2d38);
      overflow: hidden;
    }
    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.6rem 1rem;
      border-bottom: 1px solid var(--border-color, #2d2d38);
      background: var(--bg-card, #18181f);
    }
    .timeline-title {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-primary, #f8fafc);
    }
    .actions-group {
      display: flex;
      gap: 0.4rem;
    }
    .action-btn {
      background: var(--bg-card, #262633);
      color: var(--text-primary, #f8fafc);
      border: 1px solid var(--border-color, #475569);
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .action-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .undo-btn:not(:disabled):hover {
      border-color: var(--color-warning, #f59e0b);
      color: var(--color-warning, #f59e0b);
    }
    .redo-btn:not(:disabled):hover {
      border-color: var(--color-primary, #38bdf8);
      color: var(--color-primary, #38bdf8);
    }
    .checkpoints-list {
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      max-height: 200px;
      overflow-y: auto;
    }
    .checkpoint-row {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.35rem 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .checkpoint-row:hover {
      background: var(--bg-card, #262633);
    }
    .checkpoint-row.active {
      background: var(--bg-card, #0f172a);
      border-left: 3px solid var(--color-primary, #38bdf8);
    }
    .checkpoint-bullet {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-primary, #38bdf8);
      margin-top: 5px;
    }
    .checkpoint-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .checkpoint-hash {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--color-primary, #38bdf8);
    }
    .checkpoint-msg {
      font-size: 0.82rem;
      color: var(--text-primary, #f8fafc);
    }
    .checkpoint-meta {
      font-size: 0.72rem;
      color: var(--text-muted, #94a3b8);
    }
    .empty-state {
      text-align: center;
      padding: 1.5rem;
      color: var(--text-muted, #94a3b8);
      font-size: 0.85rem;
    }
  `]
})
export class CheckpointTimelineComponent {
  @Input() public checkpoints: CheckpointRecord[] = [];
  @Input() public canUndo: boolean = true;
  @Input() public canRedo: boolean = false;

  @Output() public readonly undo: EventEmitter<void> = new EventEmitter();
  @Output() public readonly redo: EventEmitter<void> = new EventEmitter();
  @Output() public readonly checkpointSelected: EventEmitter<string> = new EventEmitter();

  public readonly activeCheckpointId: WritableSignal<string | null> = signal(null);
  public diffDrawerOpen: boolean = false;
  public diffText: string = '';

  public triggerUndo(): void {
    if (this.canUndo) {
      this.undo.emit();
    }
  }

  public triggerRedo(): void {
    if (this.canRedo) {
      this.redo.emit();
    }
  }

  public selectCheckpoint(id: string): void {
    this.activeCheckpointId.set(id);
    this.diffDrawerOpen = true;
    const selected = this.checkpoints.find((c) => c.id === id);
    const initial = this.checkpoints[0];
    if (selected && initial && selected !== initial) {
      this.diffText = `${selected.text || selected.message}\n- ${initial.text || initial.message}`;
    } else if (selected) {
      this.diffText = selected.text || selected.message || '';
    }
    this.checkpointSelected.emit(id);
  }
}