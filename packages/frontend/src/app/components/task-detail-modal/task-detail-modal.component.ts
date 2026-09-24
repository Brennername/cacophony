import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArenaStateStore } from '../../services/arena-state.store';

/**
 * Mobile-first comprehensive Task Drill-Down Modal dialog:
 * Displays complete task metadata, prompt, assigned model, focus files,
 * test commands, execution stages timeline, and full scrollable LLM terminal stream.
 */
@Component({
  selector: 'app-task-detail-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (store.selectedTask(); as task) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal-content cacophony-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="header-titles">
              <div class="badge-row">
                <span class="badge priority">{{ task.priority }}</span>
                <span class="badge status" [ngClass]="task.status.toLowerCase()">{{ task.status }}</span>
                <span class="badge role">{{ task.role }}</span>
              </div>
              <h3>{{ task.title }}</h3>
              <span class="task-id">ID: {{ task.id }}</span>
            </div>
            <button class="close-btn" (click)="close()" aria-label="Close dialog">✕</button>
          </div>

          <div class="modal-body">
            <!-- Details Grid -->
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">Model Assigned</span>
                <span class="meta-val font-mono">{{ task.modelAssigned || 'None' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Test Command</span>
                <span class="meta-val font-mono">{{ task.testCommand || 'None' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Focus Files</span>
                <span class="meta-val font-mono">{{ task.focusFiles || 'All workspace' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Pull Request</span>
                @if (task.prUrl) {
                  <a [href]="task.prUrl" target="_blank" rel="noopener" class="pr-link">View in Gitea ↗</a>
                } @else {
                  <span class="meta-val">None</span>
                }
              </div>
            </div>

            <!-- Task Directive / Prompt -->
            <div class="section-block">
              <h4 class="section-title">Architectural Directive / Prompt</h4>
              <div class="prompt-box">
                <pre class="prompt-text">{{ task.prompt || 'No extended prompt directive supplied.' }}</pre>
              </div>
            </div>

            <!-- Execution Stages (if available) -->
            @if (task.stages && task.stages.length > 0) {
              <div class="section-block">
                <h4 class="section-title">Pipeline Execution Stages ({{ task.stages.length }})</h4>
                <div class="stages-list">
                  @for (st of task.stages; track st.id) {
                    <div class="stage-item" [ngClass]="st.stageStatus.toLowerCase()">
                      <div class="stage-top">
                        <span class="stage-name">{{ st.stageName | uppercase }}</span>
                        <span class="stage-status">{{ st.stageStatus }}</span>
                        <span class="stage-duration font-mono">{{ st.durationMs ? st.durationMs + 'ms' : 'Active' }}</span>
                      </div>
                      @if (st.logOutput) {
                        <pre class="stage-log"><code>{{ st.logOutput }}</code></pre>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Full Scrollable Terminal Stream -->
            <div class="section-block">
              <div class="terminal-header-row">
                <h4 class="section-title">Live Terminal & Inference Output Stream</h4>
                <span class="live-indicator">● LIVE STREAM</span>
              </div>
              <div class="full-terminal-box">
                <div class="terminal-bar">
                  <span class="dot red"></span>
                  <span class="dot yellow"></span>
                  <span class="dot green"></span>
                  <span class="terminal-title font-mono">{{ task.id }} (Live LLM Tokens)</span>
                </div>
                <pre class="full-terminal-content"><code>{{ liveStreamBuffer() || task.logSnippet || 'Awaiting model inference tokens...' }}</code></pre>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline" (click)="close()">Close</button>
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
      z-index: 1050;
      padding: 1rem;
    }

    .modal-content {
      width: 100%;
      max-width: 780px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      overflow: hidden;
      animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalFadeIn {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-surface-elevated);
    }

    .badge-row {
      display: flex;
      gap: 0.375rem;
      margin-bottom: 0.375rem;
    }

    .badge {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
    }

    .badge.priority {
      background: var(--color-brand);
      color: #ffffff;
    }

    .badge.status.running {
      background: var(--status-nominal);
      color: #ffffff;
    }

    .badge.status.pending {
      background: var(--status-warm);
      color: #ffffff;
    }

    .badge.status.completed {
      background: var(--color-brand-secondary, #2563eb);
      color: #ffffff;
    }

    .badge.status.failed {
      background: var(--status-danger);
      color: #ffffff;
    }

    .badge.role {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
    }

    .header-titles h3 {
      font-size: 1.125rem;
      color: var(--text-primary);
      margin: 0;
      line-height: 1.3;
    }

    .task-id {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.25rem;
      cursor: pointer;
      line-height: 1;
      padding: 0.25rem;
    }

    .close-btn:hover {
      color: var(--text-primary);
    }

    .modal-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      overflow-y: auto;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.625rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
    }

    @media (min-width: 640px) {
      .meta-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .meta-label {
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .meta-val {
      font-size: 0.8125rem;
      color: var(--text-primary);
      word-break: break-all;
    }

    .pr-link {
      font-size: 0.8125rem;
      color: var(--color-brand);
      text-decoration: none;
      font-weight: 600;
    }

    .pr-link:hover {
      text-decoration: underline;
    }

    .section-block {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .section-title {
      font-size: 0.8125rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-secondary);
      margin: 0;
    }

    .prompt-box {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.875rem;
    }

    .prompt-text {
      margin: 0;
      white-space: pre-wrap;
      font-family: var(--font-sans);
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--text-primary);
    }

    /* Stages */
    .stages-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .stage-item {
      background: var(--bg-surface-elevated);
      border-left: 3px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.625rem 0.75rem;
    }

    .stage-item.success { border-left-color: var(--status-nominal); }
    .stage-item.failure { border-left-color: var(--status-danger); }
    .stage-item.running { border-left-color: var(--color-brand); }

    .stage-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
    }

    .stage-name {
      font-weight: 700;
      color: var(--text-primary);
    }

    .stage-status {
      font-size: 0.6875rem;
      color: var(--text-secondary);
    }

    .stage-duration {
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .stage-log {
      margin: 0.5rem 0 0 0;
      padding: 0.5rem;
      background: #000000;
      color: #94a3b8;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      border-radius: var(--radius-sm);
      white-space: pre-wrap;
      max-height: 120px;
      overflow-y: auto;
    }

    /* Full Terminal */
    .terminal-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .live-indicator {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--status-nominal);
    }

    .full-terminal-box {
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      background: #000000;
      overflow: hidden;
    }

    .terminal-bar {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      background: #11141c;
      border-bottom: 1px solid var(--border-subtle);
    }

    .terminal-bar .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .terminal-bar .dot.red { background: #ef4444; }
    .terminal-bar .dot.yellow { background: #f59e0b; }
    .terminal-bar .dot.green { background: #10b981; }

    .terminal-title {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-left: 0.5rem;
    }

    .full-terminal-content {
      margin: 0;
      padding: 1rem;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: #38bdf8;
      white-space: pre-wrap;
      max-height: 260px;
      overflow-y: auto;
      line-height: 1.4;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      padding: 0.875rem 1.25rem;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-surface-elevated);
    }
  `],
})
export class TaskDetailModalComponent {
  public readonly store = inject(ArenaStateStore);
  public readonly liveStreamBuffer = this.store.liveStreamBuffer;

  public close(): void {
    this.store.clearSelectedTask();
  }
}
