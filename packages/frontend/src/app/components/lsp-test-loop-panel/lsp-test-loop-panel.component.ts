import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface LspDiagnostic {
  readonly id: string;
  readonly filePath: string;
  readonly line: number;
  readonly character: number;
  readonly severity: 'error' | 'warning' | 'info';
  readonly code: string | number;
  readonly message: string;
}

export interface TestExecutionState {
  readonly status: 'idle' | 'running' | 'passed' | 'failed' | 'remediating';
  readonly runnerName: string;
  readonly durationMs: number;
  readonly passedCount: number;
  readonly failedCount: number;
  readonly failureSnippet?: string;
}

/**
 * Real-time widget rendering live LSP compiler diagnostics and automated test loop status.
 */
@Component({
  selector: 'app-lsp-test-loop-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel-container">
      <div class="test-loop-section">
        <div class="section-header">
          <span class="section-title">Automated Test Feedback Loop</span>
          <button class="rerun-btn" (click)="reRunTests.emit()">Run Scoped Tests</button>
        </div>

        <div class="test-status-card" [class]="testState().status">
          <div class="status-summary">
            <span class="status-badge">{{ testState().status.toUpperCase() }}</span>
            <span class="runner-tag">Runner: {{ testState().runnerName }}</span>
            <span class="counts-tag">{{ testState().passedCount }} pass • {{ testState().failedCount }} fail</span>
            <span class="duration-tag">{{ testState().durationMs }}ms</span>
          </div>

          @if (testState().failureSnippet) {
            <div class="failure-drawer">
              <pre class="failure-text">{{ testState().failureSnippet }}</pre>
            </div>
          }
        </div>
      </div>

      <div class="diagnostics-section">
        <div class="section-header">
          <span class="section-title">LSP Compiler Diagnostics ({{ diagnostics().length }})</span>
        </div>

        <div class="diagnostics-list">
          @for (d of diagnostics(); track d.id) {
            <div class="diagnostic-item" [class]="d.severity">
              <div class="diag-header">
                <span class="severity-tag">{{ d.severity.toUpperCase() }}</span>
                <span class="code-tag">TS{{ d.code }}</span>
                <span class="location-tag">{{ d.filePath }}:{{ d.line }}:{{ d.character }}</span>
              </div>
              <p class="diag-message">{{ d.message }}</p>
            </div>
          } @empty {
            <div class="clean-state">No compiler diagnostics detected (Clean Workspace).</div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .panel-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      background: var(--bg-surface, #1e1e24);
      border-radius: 6px;
      border: 1px solid var(--border-color, #2d2d38);
      padding: 0.75rem;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
    }
    .section-title {
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--text-primary, #f8fafc);
    }
    .rerun-btn {
      background: var(--bg-card, #262633);
      border: 1px solid var(--border-color, #475569);
      color: var(--text-primary, #f8fafc);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
    }
    .rerun-btn:hover {
      border-color: var(--color-primary, #38bdf8);
      color: var(--color-primary, #38bdf8);
    }
    .test-status-card {
      padding: 0.5rem 0.75rem;
      border-radius: 4px;
      background: var(--bg-card, #262633);
      border-left: 4px solid var(--border-color, #475569);
    }
    .test-status-card.passed {
      border-left-color: var(--color-success, #10b981);
    }
    .test-status-card.failed {
      border-left-color: var(--color-danger, #ef4444);
    }
    .test-status-card.remediating {
      border-left-color: var(--color-warning, #f59e0b);
    }
    .status-summary {
      display: flex;
      gap: 0.5rem;
      font-size: 0.78rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .status-badge {
      font-weight: 700;
      color: var(--text-primary, #f8fafc);
    }
    .runner-tag, .counts-tag, .duration-tag {
      color: var(--text-muted, #94a3b8);
      font-family: monospace;
    }
    .failure-drawer {
      margin-top: 0.5rem;
      background: var(--bg-input, #0f172a);
      padding: 0.4rem;
      border-radius: 4px;
      max-height: 120px;
      overflow-y: auto;
    }
    .failure-text {
      margin: 0;
      font-size: 0.75rem;
      color: var(--color-danger, #ef4444);
      white-space: pre-wrap;
      font-family: monospace;
    }
    .diagnostics-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      max-height: 150px;
      overflow-y: auto;
    }
    .diagnostic-item {
      padding: 0.35rem 0.5rem;
      border-radius: 4px;
      background: var(--bg-card, #262633);
      border-left: 3px solid transparent;
    }
    .diagnostic-item.error {
      border-left-color: var(--color-danger, #ef4444);
    }
    .diagnostic-item.warning {
      border-left-color: var(--color-warning, #f59e0b);
    }
    .diag-header {
      display: flex;
      gap: 0.4rem;
      font-size: 0.72rem;
      font-family: monospace;
      color: var(--text-muted, #94a3b8);
    }
    .diag-message {
      margin: 0.2rem 0 0 0;
      font-size: 0.8rem;
      color: var(--text-primary, #f8fafc);
    }
    .clean-state {
      padding: 0.75rem;
      text-align: center;
      color: var(--color-success, #10b981);
      font-size: 0.8rem;
    }
  `]
})
export class LspTestLoopPanelComponent {
  public readonly testState = input<TestExecutionState>({
    status: 'passed',
    runnerName: 'node:test',
    durationMs: 42,
    passedCount: 120,
    failedCount: 0
  });

  public readonly diagnostics = input<LspDiagnostic[]>([]);
  public readonly reRunTests = output<void>();
}
