import { Component, Input, OnInit, signal, HostListener, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ModalTab = 'full_output' | 'failing_assertions' | 'code_diffs' | 'environment_variables';

/**
 * TestRunDetailModalComponent
 *
 * Deep inspection modal for completed or failed test executions (Phase 59: T59.6).
 * Renders tabbed views: Full Output, Failing Assertions, Code Diffs, and Environment Variables.
 * Fully accessible with Escape key dismiss, backdrop click handling, and mobile-first responsive layout.
 */
@Component({
  selector: 'app-test-run-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal-container" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <!-- Modal Header -->
          <div class="modal-header">
            <div class="header-titles">
              <h2 class="modal-title">Test Execution Inspection</h2>
              <span class="task-badge">{{ task?.id || 'Task Run' }}</span>
            </div>
            <button type="button" class="close-btn" (click)="close()" aria-label="Close dialog">
              ✕
            </button>
          </div>

          <!-- Modal Tabs (T59.6.2) -->
          <div class="modal-tabs" role="tablist">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'full_output'"
              (click)="setTab('full_output')"
              role="tab"
              [attr.aria-selected]="activeTab() === 'full_output'"
            >
              Full Output
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'failing_assertions'"
              (click)="setTab('failing_assertions')"
              role="tab"
              [attr.aria-selected]="activeTab() === 'failing_assertions'"
            >
              Failing Assertions ({{ failingAssertions.length }})
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'code_diffs'"
              (click)="setTab('code_diffs')"
              role="tab"
              [attr.aria-selected]="activeTab() === 'code_diffs'"
            >
              Code Diffs
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'environment_variables'"
              (click)="setTab('environment_variables')"
              role="tab"
              [attr.aria-selected]="activeTab() === 'environment_variables'"
            >
              Environment Variables
            </button>
          </div>

          <!-- Tab Content Panes -->
          <div class="modal-body">
            @switch (activeTab()) {
              @case ('full_output') {
                <div class="tab-pane">
                  <pre class="terminal-box">{{ fullOutput || 'No output recorded for this run.' }}</pre>
                </div>
              }
              @case ('failing_assertions') {
                <div class="tab-pane">
                  @if (failingAssertions.length === 0) {
                    <p class="empty-state">Zero failing assertions identified in this execution.</p>
                  } @else {
                    <div class="assertions-list">
                      @for (assertion of failingAssertions; track $index) {
                        <div class="assertion-card danger">
                          <span class="assertion-index">Assertion #{{ $index + 1 }}</span>
                          <pre class="assertion-text">{{ assertion }}</pre>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
              @case ('code_diffs') {
                <div class="tab-pane">
                  <pre class="diff-box">{{ codeDiffs || 'No code modifications associated with this test execution.' }}</pre>
                </div>
              }
              @case ('environment_variables') {
                <div class="tab-pane">
                  <div class="env-table-wrapper">
                    <table class="env-table">
                      <thead>
                        <tr>
                          <th>Variable</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (key of getEnvKeys(); track key) {
                          <tr>
                            <td class="env-key">{{ key }}</td>
                            <td class="env-val"><code>{{ environmentVariables[key] }}</code></td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="close()">Dismiss</button>
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
      box-sizing: border-box;
    }

    .modal-container {
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
      border-radius: var(--radius-lg, 12px);
      width: 100%;
      max-width: 800px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
    }

    .header-titles {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .modal-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-primary, #ffffff);
      margin: 0;
    }

    .task-badge {
      font-family: var(--font-mono, monospace);
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      background: var(--bg-surface-elevated, #2a2a32);
      border-radius: var(--radius-sm, 4px);
      color: var(--color-brand, #3b82f6);
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted, #a1a1aa);
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-tabs {
      display: flex;
      gap: 0.25rem;
      padding: 0.5rem 1rem 0 1rem;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      background: var(--bg-surface-elevated, #24242c);
      overflow-x: auto;
    }

    .tab-btn {
      padding: 0.5rem 0.85rem;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-muted, #a1a1aa);
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .tab-btn.active {
      color: var(--color-brand, #3b82f6);
      border-bottom-color: var(--color-brand, #3b82f6);
      font-weight: 600;
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 1rem 1.25rem;
      min-height: 250px;
    }

    .terminal-box, .diff-box {
      background: var(--bg-primary, #0a0d14);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: var(--radius-sm, 6px);
      padding: 0.75rem;
      font-family: var(--font-mono, monospace);
      font-size: 0.8125rem;
      color: var(--text-primary, #e4e4e7);
      white-space: pre-wrap;
      word-break: break-all;
      margin: 0;
      max-height: 400px;
      overflow-y: auto;
    }

    .assertions-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .assertion-card {
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--radius-sm, 6px);
      padding: 0.75rem;
      background: rgba(239, 68, 68, 0.05);
    }

    .assertion-index {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--status-danger, #ef4444);
      display: block;
      margin-bottom: 0.35rem;
    }

    .assertion-text {
      margin: 0;
      font-family: var(--font-mono, monospace);
      font-size: 0.8125rem;
      color: var(--text-primary, #ffffff);
      white-space: pre-wrap;
    }

    .empty-state {
      color: var(--text-muted, #a1a1aa);
      font-style: italic;
      text-align: center;
      margin: 2rem 0;
    }

    .env-table-wrapper {
      overflow-x: auto;
    }

    .env-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }

    .env-table th, .env-table td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      text-align: left;
    }

    .env-key {
      font-weight: 600;
      color: var(--text-primary, #ffffff);
      font-family: var(--font-mono, monospace);
    }

    .modal-footer {
      padding: 0.75rem 1.25rem;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      display: flex;
      justify-content: flex-end;
    }

    .btn {
      padding: 0.45rem 1rem;
      border-radius: var(--radius-md, 6px);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-secondary {
      background: var(--bg-surface-elevated, #2a2a32);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
      color: var(--text-primary, #ffffff);
    }
  `]
})
export class TestRunModalComponent implements OnInit {
  @Input() public task: any | null = null;
  @Output() public closed = new EventEmitter<void>();

  public readonly isOpen = signal<boolean>(false);
  public readonly activeTab = signal<ModalTab>('full_output');

  public fullOutput = '';
  public failingAssertions: string[] = [];
  public codeDiffs = '';
  public environmentVariables: Record<string, string> = {};

  @HostListener('document:keydown.escape')
  public handleEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }

  public ngOnInit(): void {
    if (this.task) {
      this.open(this.task);
    }
  }

  public open(taskData?: any): void {
    if (taskData) {
      this.task = taskData;
      this.fullOutput = taskData.fullOutput || taskData.logSnippet || taskData.command || 'No execution output.';
      this.failingAssertions = taskData.failingAssertions || (taskData.failureReason ? [taskData.failureReason] : []);
      this.codeDiffs = taskData.codeDiffs || taskData.diff || '';
      this.environmentVariables = taskData.environmentVariables || {
        NODE_ENV: 'test',
        AUTONOMOUS_TEST_GATE: 'strict',
        PORT: '24161'
      };
    }
    this.isOpen.set(true);
  }

  public close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  public setTab(tab: ModalTab): void {
    this.activeTab.set(tab);
  }

  public getEnvKeys(): string[] {
    return Object.keys(this.environmentVariables);
  }
}
