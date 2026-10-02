import { Component, OnInit, OnDestroy, inject, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ArenaStateStore, ProcessItem } from '../../services/arena-state.store';
import { ProcessInspectorComponent } from '../process-inspector/process-inspector.component';

/**
 * TestingViewComponent
 *
 * Dedicated route view for live test execution monitoring, real-time subprocess telemetry,
 * and high-density terminal log streaming (Phase 59: T59.1 - T59.5).
 */
@Component({
  selector: 'app-testing-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ProcessInspectorComponent],
  template: `
    <div class="testing-view-container">
      <!-- View Header -->
      <header class="view-header">
        <div class="header-titles">
          <h1>Live Test Execution & Subprocess Engine</h1>
          <p class="subtitle">Real-time test runner stdout/stderr, subprocess lifecycle, and pass/fail metrics</p>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="btn btn-secondary"
            (click)="copyLog()"
            [attr.aria-label]="copiedFeedback() ? 'Copied' : 'Copy test output log'"
          >
            {{ copiedFeedback() ? 'Copied to Clipboard' : 'Copy Output Log' }}
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            (click)="clearLog()"
            aria-label="Clear test output log"
          >
            Clear Log
          </button>
        </div>
      </header>

      <!-- Summary Metric Counters (T59.2.3) -->
      <section class="summary-counters" aria-label="Test execution metrics">
        <div class="counter-card">
          <span class="counter-label">Total Tests Run</span>
          <span class="counter-value">{{ totalTestsRun() }}</span>
        </div>
        <div class="counter-card nominal">
          <span class="counter-label">Passed</span>
          <span class="counter-value">{{ passedCount() }}</span>
        </div>
        <div class="counter-card danger">
          <span class="counter-label">Failed</span>
          <span class="counter-value">{{ failedCount() }}</span>
        </div>
        <div class="counter-card brand">
          <span class="counter-label">Pass Rate</span>
          <span class="counter-value">{{ passRatePercent() }}%</span>
        </div>
        <div class="counter-card">
          <span class="counter-label">Avg Duration</span>
          <span class="counter-value">{{ avgDurationMs() }}ms</span>
        </div>
      </section>

      <!-- Active Test Execution Card (T59.2.2) -->
      <section class="active-test-card" aria-label="Active test execution">
        <div class="card-header">
          <div class="card-title-group">
            <span class="pulse-indicator" [class.active]="isActiveTestRunning()"></span>
            <h2>Active Test Subprocess</h2>
          </div>
          <span class="status-pill" [ngClass]="activeTestStatus().toLowerCase()">
            {{ activeTestStatus() }}
          </span>
        </div>

        <div class="card-body">
          <div class="meta-row">
            <span class="meta-key">Command:</span>
            <code class="meta-code">{{ activeTestCommand() }}</code>
          </div>
          @if (activeTestTargetFiles().length > 0) {
            <div class="meta-row">
              <span class="meta-key">Focus Files:</span>
              <div class="focus-files-list">
                @for (file of activeTestTargetFiles(); track file) {
                  <span class="file-pill">{{ file }}</span>
                }
              </div>
            </div>
          }
          <div class="meta-row">
            <span class="meta-key">Elapsed Duration:</span>
            <span class="duration-display">{{ activeTestDurationMs() }}ms</span>
          </div>
        </div>
      </section>

      <!-- Live Test Output Terminal (T59.3.1, T59.3.2, T59.3.3) -->
      <section class="test-terminal-section" aria-label="Live test output terminal">
        <div class="terminal-toolbar">
          <div class="toolbar-title">
            <span class="terminal-dot red"></span>
            <span class="terminal-dot yellow"></span>
            <span class="terminal-dot green"></span>
            <span class="terminal-label">test-runner-stream</span>
          </div>
          <div class="toolbar-controls">
            <button
              type="button"
              class="toolbar-toggle"
              [class.active]="autoScroll()"
              (click)="toggleAutoScroll()"
              [attr.aria-pressed]="autoScroll()"
            >
              Auto-Scroll: {{ autoScroll() ? 'ON' : 'OFF' }}
            </button>
            <span class="line-counter">{{ testOutput().length }} lines</span>
          </div>
        </div>

        <div #terminalContainer class="terminal-body" role="log" aria-live="polite">
          @if (testOutput().length === 0) {
            <div class="terminal-empty">
              <span>Waiting for test subprocess stream output...</span>
            </div>
          } @else {
            <div class="terminal-lines">
              @for (line of testOutput(); track $index) {
                <div class="terminal-line">
                  <span class="line-number">{{ $index + 1 }}</span>
                  <span class="line-text" [ngClass]="classifyLine(line)">{{ line }}</span>
                </div>
              }
            </div>
          }
        </div>
      </section>

      <!-- Historical Test Filter Controls (T59.4.3) -->
      <section class="filter-controls-section" aria-label="Test run filters">
        <div class="filter-tabs" role="tablist">
          <button
            type="button"
            class="tab-btn"
            [class.active]="filterStatus() === 'ALL'"
            (click)="filterTests('ALL')"
            role="tab"
            [attr.aria-selected]="filterStatus() === 'ALL'"
          >
            ALL ({{ store.processes().length }})
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="filterStatus() === 'PASSED'"
            (click)="filterTests('PASSED')"
            role="tab"
            [attr.aria-selected]="filterStatus() === 'PASSED'"
          >
            PASSED ({{ passedCount() }})
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="filterStatus() === 'FAILED'"
            (click)="filterTests('FAILED')"
            role="tab"
            [attr.aria-selected]="filterStatus() === 'FAILED'"
          >
            FAILED ({{ failedCount() }})
          </button>
        </div>

        <div class="search-box">
          <input
            type="search"
            class="search-input"
            placeholder="Filter by command or task ID..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            aria-label="Filter test runs"
          />
        </div>
      </section>

      <!-- Historical Subprocess Inspector Table -->
      <section class="processes-table-section">
        <app-process-inspector />
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .testing-view-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-height: 100%;
      padding-bottom: 2rem;
    }

    .view-header {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    @media (min-width: 768px) {
      .view-header {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }
    }

    .header-titles h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin: 0.25rem 0 0 0;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8125rem;
      font-weight: 600;
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius-md, 8px);
      cursor: pointer;
      transition: background-color 0.15s ease, border-color 0.15s ease;
      font-family: var(--font-sans);
    }

    .btn-secondary {
      background: var(--bg-surface);
      color: var(--text-primary);
      border: 1px solid var(--border-subtle);
    }

    .btn-secondary:hover {
      background: var(--bg-surface-elevated);
      border-color: var(--border-strong);
    }

    /* Summary Metric Counters */
    .summary-counters {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }

    @media (min-width: 640px) {
      .summary-counters {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (min-width: 1024px) {
      .summary-counters {
        grid-template-columns: repeat(5, 1fr);
      }
    }

    .counter-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md, 8px);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .counter-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .counter-value {
      font-size: 1.5rem;
      font-weight: 700;
      font-family: var(--font-mono);
      color: var(--text-primary);
    }

    .counter-card.nominal .counter-value {
      color: var(--status-nominal, #10b981);
    }

    .counter-card.danger .counter-value {
      color: var(--status-danger, #ef4444);
    }

    .counter-card.brand .counter-value {
      color: var(--color-brand, #3b82f6);
    }

    /* Active Test Card */
    .active-test-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md, 8px);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .card-title-group {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    .card-title-group h2 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
      color: var(--text-primary);
    }

    .pulse-indicator {
      width: 0.625rem;
      height: 0.625rem;
      border-radius: 50%;
      background: var(--text-muted);
    }

    .pulse-indicator.active {
      background: var(--status-nominal, #10b981);
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    }

    .status-pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      text-transform: uppercase;
      font-family: var(--font-mono);
      background: var(--bg-surface-elevated);
      color: var(--text-muted);
    }

    .status-pill.running {
      background: rgba(59, 130, 246, 0.15);
      color: var(--color-brand, #3b82f6);
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .status-pill.success, .status-pill.passed {
      background: rgba(16, 185, 129, 0.15);
      color: var(--status-nominal, #10b981);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .status-pill.failed, .status-pill.error {
      background: rgba(239, 68, 68, 0.15);
      color: var(--status-danger, #ef4444);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .meta-row {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    @media (min-width: 640px) {
      .meta-row {
        flex-direction: row;
        align-items: baseline;
        gap: 0.75rem;
      }
    }

    .meta-key {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-muted);
      min-width: 8rem;
    }

    .meta-code {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: var(--text-primary);
      background: var(--bg-primary);
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm, 4px);
      word-break: break-all;
    }

    .focus-files-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .file-pill {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      background: var(--bg-primary);
      color: var(--text-secondary);
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-sm, 4px);
      border: 1px solid var(--border-subtle);
    }

    .duration-display {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: var(--text-primary);
    }

    /* Terminal Section */
    .test-terminal-section {
      background: var(--bg-primary, #0a0d14);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md, 8px);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .terminal-toolbar {
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      padding: 0.5rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .toolbar-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .terminal-dot {
      width: 0.625rem;
      height: 0.625rem;
      border-radius: 50%;
    }

    .terminal-dot.red { background: #ef4444; }
    .terminal-dot.yellow { background: #f59e0b; }
    .terminal-dot.green { background: #10b981; }

    .terminal-label {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .toolbar-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .toolbar-toggle {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm, 4px);
      background: var(--bg-primary);
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
      cursor: pointer;
    }

    .toolbar-toggle.active {
      background: rgba(59, 130, 246, 0.2);
      color: var(--color-brand, #3b82f6);
      border-color: rgba(59, 130, 246, 0.4);
    }

    .line-counter {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .terminal-body {
      max-height: 24rem;
      min-height: 12rem;
      overflow-y: auto;
      padding: 0.75rem;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      line-height: 1.4;
      background: var(--bg-primary, #0a0d14);
    }

    .terminal-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 10rem;
      color: var(--text-muted);
      font-style: italic;
    }

    .terminal-lines {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .terminal-line {
      display: flex;
      gap: 0.75rem;
      word-break: break-all;
    }

    .line-number {
      user-select: none;
      color: var(--text-muted);
      text-align: right;
      min-width: 2.5rem;
      opacity: 0.6;
    }

    .line-text {
      color: var(--text-primary);
      flex: 1;
    }

    .line-text.pass { color: var(--status-nominal, #10b981); }
    .line-text.fail { color: var(--status-danger, #ef4444); }
    .line-text.info { color: var(--color-accent, #06b6d4); }
    .line-text.warn { color: var(--status-warm, #f59e0b); }

    /* Filter Controls Section */
    .filter-controls-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    @media (min-width: 640px) {
      .filter-controls-section {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }
    }

    .filter-tabs {
      display: flex;
      gap: 0.25rem;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      padding: 0.25rem;
      border-radius: var(--radius-md, 8px);
    }

    .tab-btn {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.375rem 0.75rem;
      border-radius: var(--radius-sm, 6px);
      background: transparent;
      color: var(--text-muted);
      border: none;
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;
    }

    .tab-btn.active {
      background: var(--bg-surface-elevated);
      color: var(--text-primary);
    }

    .search-box {
      min-width: 14rem;
    }

    .search-input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-md, 8px);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface);
      color: var(--text-primary);
      font-size: 0.8125rem;
      font-family: var(--font-sans);
    }

    .search-input:focus {
      outline: none;
      border-color: var(--color-brand);
    }
  `],
})
export class TestingViewComponent implements OnInit, OnDestroy {
  public readonly store = inject(ArenaStateStore);

  @ViewChild('terminalContainer')
  private terminalContainerRef?: ElementRef<HTMLDivElement>;

  // Reactive state signals
  public readonly testOutput = signal<string[]>([]);
  public readonly autoScroll = signal<boolean>(true);
  public readonly copiedFeedback = signal<boolean>(false);
  public readonly filterStatus = signal<'ALL' | 'PASSED' | 'FAILED'>('ALL');
  public readonly searchQuery = signal<string>('');

  private eventSource: EventSource | null = null;
  private copyTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

  // Computed summary metrics (T59.2.3)
  public readonly totalTestsRun = computed(() => this.store.processes().length);
  public readonly passedCount = computed(
    () => this.store.processes().filter((p) => p.status === 'SUCCESS').length
  );
  public readonly failedCount = computed(
    () => this.store.processes().filter((p) => p.status === 'FAILED').length
  );
  public readonly passRatePercent = computed(() => {
    const total = this.totalTestsRun();
    return total > 0 ? Math.round((this.passedCount() / total) * 100) : 100;
  });
  public readonly avgDurationMs = computed(() => {
    const list = this.store.processes();
    if (!list.length) return 0;
    const totalDuration = list.reduce((acc, p) => acc + (p.durationMs || 0), 0);
    return Math.round(totalDuration / list.length);
  });

  // Active test card bindings (T59.2.2)
  public readonly activeTask = computed(() => this.store.activeTask());
  public readonly isActiveTestRunning = computed(() => {
    const task = this.activeTask();
    return Boolean(task && (task.currentStage === 'test_execution' || task.status === 'RUNNING'));
  });
  public readonly activeTestStatus = computed(() => {
    const task = this.activeTask();
    if (!task) return 'IDLE';
    if (task.currentStage === 'test_execution') return 'RUNNING';
    return task.status;
  });
  public readonly activeTestCommand = computed(() => {
    const task = this.activeTask();
    if (task?.testCommand) return task.testCommand;
    const proc = this.store.processes().find((p) => p.status === 'RUNNING');
    if (proc?.command) return proc.command;
    return 'Waiting for test runner dispatch...';
  });
  public readonly activeTestTargetFiles = computed(() => {
    const task = this.activeTask();
    if (!task?.focusFiles) return [];
    return Array.isArray(task.focusFiles) ? task.focusFiles : [task.focusFiles];
  });
  public readonly activeTestDurationMs = computed(() => {
    const task = this.activeTask();
    if (!task || !task.createdAt) return 0;
    const start = new Date(task.createdAt).getTime();
    if (isNaN(start)) return 0;
    const end = task.completedAt ? new Date(task.completedAt).getTime() : Date.now();
    return Math.max(0, end - start);
  });

  // Filtered subprocess runs (T59.4.3)
  public readonly filteredProcesses = computed(() => {
    const list = this.store.processes();
    const filter = this.filterStatus();
    const query = this.searchQuery().toLowerCase().trim();

    return list.filter((p) => {
      const matchesStatus =
        filter === 'ALL' ||
        (filter === 'PASSED' && p.status === 'SUCCESS') ||
        (filter === 'FAILED' && p.status === 'FAILED');

      const matchesSearch =
        !query ||
        p.command.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  });

  public ngOnInit(): void {
    // Seed initial output from live buffer if active
    const buffer = this.store.liveStreamBuffer();
    if (buffer) {
      const initialLines = buffer.split('\n').filter((l) => l.trim().length > 0);
      if (initialLines.length > 0) {
        this.testOutput.set(initialLines);
      }
    }

    this.connectTestStream();
  }

  public ngOnDestroy(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.copyTimeoutHandle) {
      clearTimeout(this.copyTimeoutHandle);
      this.copyTimeoutHandle = null;
    }
  }

  /**
   * Connects to live SSE stream listening for 'test_output' and 'token' events (T59.3.1).
   */
  public connectTestStream(): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return;
    }

    try {
      this.eventSource = new EventSource('/api/events');

      this.eventSource.onmessage = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'test_output' && payload.output) {
            this.appendOutputLine(payload.output);
          } else if (payload.type === 'token' && payload.token) {
            // Echo token streams when test execution is active
            if (this.isActiveTestRunning()) {
              this.appendOutputChunk(payload.token);
            }
          }
        } catch {
          // If raw text is emitted
          if (typeof event.data === 'string' && event.data.length > 0) {
            this.appendOutputLine(event.data);
          }
        }
      };

      this.eventSource.addEventListener('test_output', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const line = data.output ?? data.line ?? String(event.data);
          this.appendOutputLine(line);
        } catch {
          this.appendOutputLine(String(event.data));
        }
      });
    } catch {
      // Gracefully handle SSE connection failures
    }
  }

  /**
   * Appends a discrete line of test output and auto-scrolls to the bottom.
   */
  public appendOutputLine(line: string): void {
    this.testOutput.update((prev) => {
      const next = [...prev, line];
      return next.length > 2000 ? next.slice(-2000) : next;
    });
    this.scrollToBottomIfNeeded();
  }

  /**
   * Appends raw output chunks and parses into lines.
   */
  public appendOutputChunk(chunk: string): void {
    const lines = chunk.split('\n');
    this.testOutput.update((prev) => {
      if (prev.length === 0) return lines;
      const last = prev[prev.length - 1]!;
      const updated = [...prev.slice(0, -1), last + lines[0]!, ...lines.slice(1)];
      return updated.length > 2000 ? updated.slice(-2000) : updated;
    });
    this.scrollToBottomIfNeeded();
  }

  /**
   * Toggles auto-scroll behavior (T59.3.3).
   */
  public toggleAutoScroll(): void {
    this.autoScroll.update((prev) => !prev);
    if (this.autoScroll()) {
      this.scrollToBottomIfNeeded(true);
    }
  }

  /**
   * Copies log buffer to clipboard (T59.3.3).
   */
  public async copyLog(): Promise<void> {
    const text = this.testOutput().join('\n');
    try {
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      this.copiedFeedback.set(true);
      if (this.copyTimeoutHandle) clearTimeout(this.copyTimeoutHandle);
      this.copyTimeoutHandle = setTimeout(() => {
        this.copiedFeedback.set(false);
      }, 2000);
    } catch {
      // Ignore clipboard write denial
    }
  }

  /**
   * Clears terminal buffer.
   */
  public clearLog(): void {
    this.testOutput.set([]);
  }

  /**
   * Filters displayed tests by status (T59.4.3).
   */
  public filterTests(status: 'ALL' | 'PASSED' | 'FAILED'): void {
    this.filterStatus.set(status);
  }

  /**
   * Triggers process restart via API (T59.5.3).
   */
  public async restartProcess(processName: string): Promise<void> {
    try {
      await fetch(`/api/processes/${encodeURIComponent(processName)}/restart`, {
        method: 'POST'
      });
    } catch {
      // Handled gracefully
    }
  }

  /**
   * Classifies log line for syntax highlighting without emojis.
   */
  public classifyLine(line: string): string {
    const lower = line.toLowerCase();
    if (lower.includes('pass') || lower.includes('ok') || lower.includes('success')) {
      return 'pass';
    }
    if (lower.includes('fail') || lower.includes('error') || lower.includes('fatal')) {
      return 'fail';
    }
    if (lower.includes('warn')) {
      return 'warn';
    }
    if (lower.includes('info') || lower.includes('run') || lower.includes('start')) {
      return 'info';
    }
    return '';
  }

  private scrollToBottomIfNeeded(force = false): void {
    if ((this.autoScroll() || force) && this.terminalContainerRef?.nativeElement) {
      setTimeout(() => {
        const el = this.terminalContainerRef?.nativeElement;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      }, 10);
    }
  }
}