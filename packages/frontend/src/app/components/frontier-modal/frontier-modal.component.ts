import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DecomposedTaskPreview {
  title: string;
  role: string;
  priority: 'P0' | 'P1' | 'P2';
}

/**
 * Modal dialogue allowing developers to enter complex, high-level feature epics
 * and decompose them via frontier model into atomic taskcade units of work.
 */
@Component({
  selector: 'app-frontier-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal-content cacophony-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>Frontier Task Decomposition</h3>
              <span class="subtext">Deconstruct complex epics into atomic arena tasks</span>
            </div>
            <button class="close-btn" (click)="close()">✕</button>
          </div>

          <div class="modal-body">
            <label class="input-label">High-Level Feature Goal</label>
            <textarea
              class="goal-input"
              rows="4"
              placeholder="e.g. Build an OAuth2 Gitea SSO provider with JWT verification..."
              [value]="goalText()"
              (input)="goalText.set($any($event.target).value)"
            ></textarea>

            <button
              class="btn btn-primary decompose-btn"
              [disabled]="isAnalyzing() || !goalText().trim()"
              (click)="simulateDecomposition()"
            >
              {{ isAnalyzing() ? 'Analyzing with Frontier Model...' : 'Decompose with Frontier Model' }}
            </button>

            @if (previews().length > 0) {
              <div class="preview-section">
                <h4>Decomposed Tasks Preview ({{ previews().length }})</h4>
                <div class="preview-list">
                  @for (p of previews(); track p.title) {
                    <div class="preview-item">
                      <span class="p-badge" [ngClass]="p.priority">{{ p.priority }}</span>
                      <span class="p-title">{{ p.title }}</span>
                      <span class="p-role">{{ p.role }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline" (click)="close()">Cancel</button>
            <button
              class="btn btn-primary"
              [disabled]="previews().length === 0"
              (click)="commitTasks()"
            >
              Commit to Arena Queue
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-content {
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-sizing: border-box;
      border-radius: var(--radius-md);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      box-shadow: var(--shadow-lg);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .subtext {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1.125rem;
    }

    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .input-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .goal-input {
      width: 100%;
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface-elevated);
      color: var(--text-primary);
      font-family: var(--font-sans);
      resize: vertical;
    }

    .decompose-btn {
      align-self: flex-start;
    }

    .preview-section {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      margin-top: 0.5rem;
    }

    .preview-section h4 {
      font-size: 0.875rem;
    }

    .preview-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 180px;
      overflow-y: auto;
    }

    .preview-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem;
      background: var(--bg-surface-elevated);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      font-size: 0.8125rem;
    }

    .p-badge {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
    }
    .p-badge.P0 { background: #ef4444; color: #fff; }
    .p-badge.P1 { background: #f59e0b; color: #fff; }
    .p-badge.P2 { background: #64748b; color: #fff; }

    .p-title {
      flex: 1;
    }

    .p-role {
      font-size: 0.6875rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border-subtle);
    }
  `],
})
export class FrontierModalComponent {
  public readonly isOpen = signal(false);
  public readonly goalText = signal('');
  public readonly isAnalyzing = signal(false);
  public readonly previews = signal<DecomposedTaskPreview[]>([]);

  public readonly committed = output<DecomposedTaskPreview[]>();

  public open(): void {
    this.isOpen.set(true);
  }

  public close(): void {
    this.isOpen.set(false);
    this.goalText.set('');
    this.previews.set([]);
    this.isAnalyzing.set(false);
  }

  public simulateDecomposition(): void {
    this.isAnalyzing.set(true);
    setTimeout(() => {
      this.previews.set([
        { title: 'Define OAuth2 endpoints and interfaces', role: 'architect', priority: 'P0' },
        { title: 'Implement Gitea code exchange HTTP client', role: 'implementer', priority: 'P1' },
        { title: 'Write integration test verifying JWT auth guard', role: 'test_engineer', priority: 'P1' },
      ]);
      this.isAnalyzing.set(false);
    }, 600);
  }

  public commitTasks(): void {
    this.committed.emit(this.previews());
    this.close();
  }
}
