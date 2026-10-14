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
  templateUrl: './lsp-test-loop-panel.component.html',
  styleUrl: './lsp-test-loop-panel.component.css',
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
