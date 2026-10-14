import { Component, OnInit, OnDestroy, inject, signal, computed, ElementRef, ViewChild, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ArenaStateStore, ProcessItem } from '../../services/arena-state.store';
import { TaskApiService } from '../../services/task-api.service';
import { ProcessInspectorComponent } from '../process-inspector/process-inspector.component';
import { TestRunModalComponent } from '../test-run-modal/test-run-modal.component';
import { TestFilterToolbarComponent, TestFilterOption } from '../test-filter-toolbar/test-filter-toolbar.component';
import { ProcessDrawerComponent } from '../process-drawer/process-drawer.component';

/**
 * TestingViewComponent
 *
 * Dedicated route view for live test execution monitoring, real-time subprocess telemetry,
 * and high-density terminal log streaming (Phase 59: T59.1 - T59.5, Phase 65: T65.1 - T65.6).
 */
@Component({
  selector: 'app-testing-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProcessInspectorComponent,
    TestRunModalComponent,
    TestFilterToolbarComponent,
    ProcessDrawerComponent,
  ],
  templateUrl: './testing-view.component.html',
  styleUrl: './testing-view.component.css',
})
export class TestingViewComponent implements OnInit, OnDestroy {
  public readonly store = inject(ArenaStateStore);
  public readonly taskApiService = inject(TaskApiService);
  public readonly testRunModal = viewChild(TestRunModalComponent);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  @ViewChild('terminalContainer')
  private terminalContainerRef?: ElementRef<HTMLDivElement>;

  // Reactive state signals
  public readonly testOutput = signal<string[]>([]);
  public readonly autoScroll = signal<boolean>(true);
  public readonly copiedFeedback = signal<boolean>(false);
  public readonly filterStatus = signal<TestFilterOption>('ALL');
  public readonly searchQuery = signal<string>('');

  private eventSource: EventSource | null = null;
  private copyTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

  // Computed summary metrics (T59.2.3, T65.3)
  public readonly totalTestsRun = computed(() => this.store.processes().length);
  public readonly passedCount = computed(
    () => this.store.processes().filter((p) => p.status === 'SUCCESS').length
  );
  public readonly failedCount = computed(
    () => this.store.processes().filter((p) => p.status === 'FAILED').length
  );
  public readonly runningCount = computed(
    () => this.store.processes().filter((p) => p.status === 'RUNNING').length
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

  // Filtered subprocess runs (T59.4.3, T65.3)
  public readonly filteredProcesses = computed(() => {
    const list = this.store.processes();
    const filter = this.filterStatus();
    const query = this.searchQuery().toLowerCase().trim();

    return list.filter((p) => {
      const matchesStatus =
        filter === 'ALL' ||
        (filter === 'PASSED' && p.status === 'SUCCESS') ||
        (filter === 'FAILED' && p.status === 'FAILED') ||
        (filter === 'RUNNING' && p.status === 'RUNNING');

      const matchesSearch =
        !query ||
        p.command.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.taskTitle && p.taskTitle.toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  });

  public ngOnInit(): void {
    // Seed initial output from live buffer if active
    const buffer = typeof this.store.liveStreamBuffer === 'function' ? this.store.liveStreamBuffer() : '';
    if (buffer) {
      const initialLines = buffer.split('\n').filter((l) => l.trim().length > 0);
      if (initialLines.length > 0) {
        this.testOutput.set(initialLines);
      }
    }

    // Sync initial filter and search state from URL query parameters (T65.3.3)
    if (this.route) {
      this.route.queryParams.subscribe((params) => {
        const filterParam = params['filter']?.toUpperCase();
        if (
          filterParam === 'PASSED' ||
          filterParam === 'FAILED' ||
          filterParam === 'RUNNING' ||
          filterParam === 'ALL'
        ) {
          this.filterStatus.set(filterParam as TestFilterOption);
        }
        if (params['q']) {
          this.searchQuery.set(params['q']);
        }
      });
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
   * Filters displayed tests by status and synchronizes with URL (T59.4.3, T65.3.3).
   */
  public filterTests(status: TestFilterOption): void {
    this.onFilterChanged(status);
  }

  public onFilterChanged(filter: TestFilterOption): void {
    this.filterStatus.set(filter);
    if (this.router && this.route) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { filter: filter !== 'ALL' ? filter.toLowerCase() : null },
        queryParamsHandling: 'merge',
      });
    }
  }

  public onSearchChanged(query: string): void {
    this.searchQuery.set(query);
    if (this.router && this.route) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { q: query.trim() || null },
        queryParamsHandling: 'merge',
      });
    }
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

  /**
   * Opens the deep test execution inspection modal (T59.6).
   */
  public inspectTestRun(proc: ProcessItem): void {
    this.testRunModal()?.open({
      id: proc.id,
      taskTitle: (proc as any).taskTitle || proc.command,
      fullOutput: (proc as any).output || proc.command,
      failingAssertions: proc.status === 'FAILED' ? [(proc as any).error || 'Process returned non-zero exit code'] : [],
      codeDiffs: (proc as any).codeDiffs || '',
      environmentVariables: (proc as any).env || {
        PROCESS_NAME: proc.name || 'test-runner',
        PID: String(proc.pid || 0),
        STATUS: proc.status
      }
    });
  }

  // Mobile card swipe and quick action state (T65.1.2)
  public readonly swipedCardId = signal<string | null>(null);
  private touchStartX = 0;

  public onTouchStart(event: TouchEvent, procId: string): void {
    if (event.touches.length > 0) {
      this.touchStartX = event.touches[0].clientX;
    }
  }

  public onTouchEnd(event: TouchEvent, procId: string): void {
    if (event.changedTouches.length > 0) {
      const touchEndX = event.changedTouches[0].clientX;
      const diffX = this.touchStartX - touchEndX;
      // Swipe left (> 30px) reveals quick actions; swipe right (> 30px) collapses
      if (diffX > 30) {
        this.swipedCardId.set(procId);
      } else if (diffX < -30 && this.swipedCardId() === procId) {
        this.swipedCardId.set(null);
      }
    }
  }

  public toggleCardSwipe(procId: string): void {
    this.swipedCardId.set(this.swipedCardId() === procId ? null : procId);
  }

  public viewStderr(proc: ProcessItem): void {
    this.inspectTestRun(proc);
  }

  public async copyProcLogs(proc: ProcessItem): Promise<void> {
    const textToCopy = proc.output || proc.command;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(textToCopy);
      } catch {
        // Fallback or ignore clipboard denial
      }
    }
  }

  public async rerunTest(proc: ProcessItem): Promise<void> {
    this.appendOutputLine(`[rerun-triggered] Re-executing test command: ${proc.command}`);
    try {
      await this.taskApiService.rerunProcess(proc.id);
    } catch {
      // Handled via toast feedback in TaskApiService
    }
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