import { Component, inject, signal, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArenaStateStore } from '../../services/arena-state.store';
import { ansiToHtml } from '../../utils/ansi-to-html';

export type TaskModalTab =
  | 'overview'
  | 'stages'
  | 'diffs'
  | 'stream'
  | 'cognitive'
  | 'reviews'
  | 'stderr'
  | 'diagnostics';

export interface TaskDiagnosticData {
  readonly taskId: string;
  readonly foundOnDisk: boolean;
  readonly loggedAt?: string;
  readonly model?: string;
  readonly testCommand?: string;
  readonly exitCode?: number;
  readonly stderr?: string;
  readonly stdout?: string;
  readonly preScrubbedOutput?: string;
  readonly scrubberDiff?: string;
  readonly failureReason?: string | null;
  readonly stages?: Array<{
    readonly name: string;
    readonly status: string;
    readonly durationMs?: number;
    readonly logOutput?: string;
  }>;
}

export interface PrReviewData {
  readonly taskId: string;
  readonly prUrl?: string | null;
  readonly targetBranch?: string | null;
  readonly verdict: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECT';
  readonly solidComplianceScore: number;
  readonly reviewNotes: string;
  readonly comments: Array<{
    readonly path: string;
    readonly lineNumber: number;
    readonly comment: string;
    readonly severity: 'info' | 'warning' | 'blocker';
  }>;
  readonly merged: boolean;
}

/**
 * Mobile-first comprehensive Task Drill-Down Modal dialog:
 * Displays complete task metadata, prompt, assigned model, focus files,
 * test commands, execution stages timeline, diffs, stderr, PR reviews, and full scrollable LLM terminal stream.
 *
 * Implements:
 * - Tabbed sub-views: Overview, Stages & Timings, Code Diffs, Full Stream Log, PR Reviews, Test Stderr.
 * - Copy-to-clipboard actions for prompt, diff, test command, and terminal logs.
 * - Touch-friendly close buttons and Escape key listener complying with mobile-first standards.
 */
@Component({
  selector: 'app-task-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-detail-modal.component.html',
  styleUrl: './task-detail-modal.component.css',
})
export class TaskDetailModalComponent {
  public readonly store = inject(ArenaStateStore);
  public readonly liveStreamBuffer = this.store.liveStreamBuffer;
  public readonly activeTab = signal<TaskModalTab>('overview');
  public readonly copiedMessage = signal<string | null>(null);

  // User-defined static custom dimensions to prevent dynamic tab jumps
  public readonly customWidth = signal<number | null>(null);
  public readonly customHeight = signal<number | null>(null);
  public isResizing = false;
  public justResized = false;
  private backdropPointerDownTarget: EventTarget | null = null;
  private backdropMouseDownTarget: EventTarget | null = null;

  // Task-specific stream buffer fetched from backend
  public readonly taskStreamBuffer = signal<string | null>(null);

  // PR Review state
  public readonly prReviewData = signal<PrReviewData | null>(null);
  public readonly loadingReview = signal<boolean>(false);

  // Post-mortem diagnostic state (T70.4.2)
  public readonly diagnosticData = signal<TaskDiagnosticData | null>(null);
  public readonly loadingDiagnostics = signal<boolean>(false);
  public readonly isRetrying = signal<boolean>(false);

  // Cognitive trace and distilled opinion state
  public readonly opinionData = signal<{
    taskId: string;
    hasReasoning: boolean;
    reasoningTranscript: string;
    thinkingDurationMs: number;
    opinion: {
      summary: string;
      keyDecisions: string[];
      identifiedRisks: string[];
      confidenceScore: number;
    };
  } | null>(null);
  public readonly loadingOpinion = signal<boolean>(false);
  public readonly Math = Math;

  constructor() {
    effect(() => {
      const task = this.store.selectedTask();
      if (!task) {
        this.taskStreamBuffer.set(null);
        this.opinionData.set(null);
        this.prReviewData.set(null);
        this.diagnosticData.set(null);
        return;
      }

      // If selected task is the active RUNNING task, liveStreamBuffer reflects it live
      if (task.status === 'RUNNING') {
        this.taskStreamBuffer.set(null);
      } else {
        void this.fetchHistoricalBuffer(task.id);
      }

      void this.fetchOpinion(task.id);
      void this.fetchPrReview(task.id);
      void this.fetchDiagnostics(task.id);
    });
  }

  public async fetchDiagnostics(taskId: string): Promise<void> {
    this.loadingDiagnostics.set(true);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/diagnostics`);
      if (res.ok) {
        const data = (await res.json()) as TaskDiagnosticData;
        this.diagnosticData.set(data);
      } else {
        this.diagnosticData.set(null);
      }
    } catch {
      this.diagnosticData.set(null);
    } finally {
      this.loadingDiagnostics.set(false);
    }
  }

  public async retryTask(taskId: string): Promise<void> {
    if (this.isRetrying()) return;
    this.isRetrying.set(true);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/retry`, {
        method: 'POST',
      });
      if (res.ok) {
        this.copiedMessage.set('Task re-queued for execution!');
        setTimeout(() => this.copiedMessage.set(null), 3000);
        await this.store.selectTask(taskId);
      } else {
        this.copiedMessage.set('Failed to re-queue task');
        setTimeout(() => this.copiedMessage.set(null), 3000);
      }
    } catch {
      this.copiedMessage.set('Network error re-queuing task');
      setTimeout(() => this.copiedMessage.set(null), 3000);
    } finally {
      this.isRetrying.set(false);
    }
  }

  public async fetchPrReview(taskId: string): Promise<void> {
    this.loadingReview.set(true);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/pr-review`);
      if (res.ok) {
        const data = (await res.json()) as PrReviewData;
        this.prReviewData.set(data);
      } else {
        this.prReviewData.set(null);
      }
    } catch {
      this.prReviewData.set(null);
    } finally {
      this.loadingReview.set(false);
    }
  }

  public formatPrLinkText(url: string): string {
    if (!url) return 'View PR';
    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'github.com' || parsed.hostname.endsWith('.github.com')) {
        const match = parsed.pathname.match(/\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
        if (match) {
          return `GitHub PR #${match[3]}`;
        }
        return 'GitHub PR';
      }
    } catch {
      // Non-standard URL format fallback
    }
    const match = url.match(/\/pulls\/(\d+)/);
    if (match) {
      return `Gitea PR #${match[1]}`;
    }
    return 'Gitea PR';
  }

  private async fetchHistoricalBuffer(taskId: string): Promise<void> {
    try {
      const res = await fetch(`/api/stream/buffer?taskId=${encodeURIComponent(taskId)}`);
      if (res.ok) {
        const data = await res.json() as { buffer?: string };
        this.taskStreamBuffer.set(data.buffer || null);
      }
    } catch {
      this.taskStreamBuffer.set(null);
    }
  }

  private async fetchOpinion(taskId: string): Promise<void> {
    this.loadingOpinion.set(true);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/opinion`);
      if (res.ok) {
        const data = await res.json();
        this.opinionData.set(data);
      } else {
        this.opinionData.set(null);
      }
    } catch {
      this.opinionData.set(null);
    } finally {
      this.loadingOpinion.set(false);
    }
  }

  public getStreamContent(task: any): string {
    if (task.status === 'RUNNING') {
      return this.liveStreamBuffer() || task.logSnippet || 'Streaming tokens from active inference...';
    }

    const fetched = this.taskStreamBuffer();
    if (fetched && fetched.trim().length > 0) {
      return fetched;
    }

    if (task.logSnippet && task.logSnippet.trim().length > 0) {
      return task.logSnippet;
    }

    // Check generation stage log
    const genStage = task.stages?.find((s: any) => s.stageName === 'generation');
    if (genStage?.logOutput) {
      return genStage.logOutput;
    }

    return '// No historical stream token log recorded for this completed/pending task.';
  }

  public isLogReduced(log: string | null | undefined): boolean {
    if (!log) return false;
    return log.includes("The log of this has been reduced, this is it's histogram:");
  }

  @HostListener('window:keydown.escape')
  public handleEscape(): void {
    this.close();
  }

  public close(): void {
    this.store.clearSelectedTask();
  }

  /**
   * Tracks target where backdrop pointerdown originates.
   */
  public onBackdropPointerDown(event: PointerEvent): void {
    this.backdropPointerDownTarget = event.target;
  }

  /**
   * Tracks target where backdrop mousedown originates.
   */
  public onBackdropMouseDown(event: MouseEvent): void {
    this.backdropMouseDownTarget = event.target;
  }

  /**
   * Dismisses modal only if pointer/mouse pressed directly on the backdrop
   * and no resize or drag interaction is occurring or recently occurred.
   */
  public onBackdropClick(event: MouseEvent): void {
    const wasDirectBackdropMousedown =
      this.backdropMouseDownTarget === event.currentTarget ||
      this.backdropPointerDownTarget === event.currentTarget;
    const isDirectBackdropClick = event.target === event.currentTarget;

    // Reset backdrop pointer targets
    this.backdropMouseDownTarget = null;
    this.backdropPointerDownTarget = null;

    if (this.isResizing || this.justResized) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (wasDirectBackdropMousedown && isDirectBackdropClick) {
      this.close();
    }
  }

  public copyText(text: string, successMessage: string): void {
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      void navigator.clipboard.writeText(text);
    }
    this.copiedMessage.set(successMessage);
    setTimeout(() => this.copiedMessage.set(null), 2500);
  }

  public extractTestStderr(task: any): string {
    const testStage = task.stages?.find((s: any) => s.stageName === 'test_execution' || s.stageName === 'test');
    if (testStage?.logOutput) {
      return testStage.logOutput;
    }
    return '// No test execution errors or stderr captured.';
  }

  public formatModalTimestamp(iso: string | null | undefined): string {
    if (!iso) return 'None';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return iso;
    }
  }

  public formatStageTime(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return '';
    }
  }

  /**
   * Initializes interactive dialog resizing via the resize grip handle.
   * Tracks pointer events across the window with boundary clamping.
   */
  public startResize(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isResizing = true;
    this.justResized = true;

    const startX = event.clientX;
    const startY = event.clientY;

    const modalEl = (event.currentTarget as HTMLElement).closest('.modal-content') as HTMLElement | null;
    const initialWidth = modalEl ? modalEl.offsetWidth : (this.customWidth() ?? 860);
    const initialHeight = modalEl ? modalEl.offsetHeight : (this.customHeight() ?? 640);

    const onPointerMove = (moveEvent: PointerEvent): void => {
      if (!this.isResizing) return;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

      const minW = 320;
      const minH = 380;
      const maxW = Math.max(minW, viewportWidth - 24);
      const maxH = Math.max(minH, viewportHeight - 24);

      const nextWidth = Math.min(Math.max(initialWidth + deltaX, minW), maxW);
      const nextHeight = Math.min(Math.max(initialHeight + deltaY, minH), maxH);

      this.customWidth.set(Math.round(nextWidth));
      this.customHeight.set(Math.round(nextHeight));
    };

    const suppressTrailingClick = (clickEvent: MouseEvent): void => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      clickEvent.stopImmediatePropagation();
      if (typeof window !== 'undefined') {
        window.removeEventListener('click', suppressTrailingClick, true);
      }
    };

    const onPointerUp = (upEvent: PointerEvent): void => {
      upEvent.preventDefault();
      upEvent.stopPropagation();
      this.isResizing = false;

      if (typeof window !== 'undefined') {
        window.addEventListener('click', suppressTrailingClick, true);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      }

      setTimeout(() => {
        this.justResized = false;
        if (typeof window !== 'undefined') {
          window.removeEventListener('click', suppressTrailingClick, true);
        }
      }, 400);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }
  }

  /**
   * Synchronizes dimensions when the user resizes via native CSS handle.
   */
  @HostListener('pointerup')
  public syncNativeResize(): void {
    if (typeof document === 'undefined') return;
    const modalEl = document.querySelector('.modal-content') as HTMLElement | null;
    if (modalEl && !this.isResizing) {
      const currentW = modalEl.offsetWidth;
      const currentH = modalEl.offsetHeight;
      if (currentW > 0 && currentH > 0 && (currentW !== this.customWidth() || currentH !== this.customHeight())) {
        if (this.customWidth() !== null || currentW !== 860 || currentH !== 640) {
          this.justResized = true;
          this.customWidth.set(currentW);
          this.customHeight.set(currentH);
          setTimeout(() => {
            this.justResized = false;
          }, 400);
        }
      }
    }
  }

  /**
   * Transforms raw log/stream output containing ANSI codes into safe, styled HTML.
   */
  public renderAnsi(text: string | null | undefined): string {
    return ansiToHtml(text);
  }
}
