import {
  Component,
  input,
  signal,
  computed,
  effect,
  viewChild,
  ElementRef,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface GanttSpan {
  id: number | string;
  name: string;
  category: 'planning' | 'inference' | 'scrub' | 'test' | 'review' | 'git';
  startOffsetMs: number;
  durationMs: number;
  status: 'SUCCESS' | 'RUNNING' | 'FAILURE' | 'PENDING';
}

/**
 * Real-time Task Pipeline Gantt Timeline:
 * 1. Live playhead that advances continuously during task execution (does not track mouse).
 * 2. Center-anchored playhead: playhead moves from 0 to center line (50%), then stays locked
 *    in the center while the timeline tracks and ruler scroll smoothly underneath it.
 * 3. Real-time expanding stage bars: active stage grows as playhead advances.
 * 4. Vertical stage labels on the left: Planning, Generation, Scrub, Test, Review, Merge.
 * 5. Waypoints across the top ruler in milliseconds of total runtime latency.
 * 6. Scale zoom controls (+/-), Recenter button, and Fit toggle.
 * 7. Free of static mock data.
 */
@Component({
  selector: 'app-gantt-transport',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gantt-transport.component.html',
  styleUrl: './gantt-transport.component.css',
})
export class GanttTransportComponent implements OnDestroy {
  public taskId = input<string | null>(null);
  public modelName = input<string | null>(null);
  public spans = input<readonly GanttSpan[]>([]);
  public totalDurationMs = input<number>(0);
  public isRunning = input<boolean>(false);

  public readonly zoomLevel = signal<number>(1.0);
  public readonly isDragging = signal<boolean>(false);
  public readonly currentPlayheadMs = signal<number>(0);
  public readonly panOffsetMs = signal<number>(0);
  public readonly isFitted = signal<boolean>(true);

  private dragStartX = 0;
  private dragStartPanOffset = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private canvasContainer = viewChild<ElementRef<HTMLElement>>('canvasContainer');

  public readonly trackDefinitions = [
    { category: 'planning' as const, label: 'Planning' },
    { category: 'inference' as const, label: 'Generation' },
    { category: 'scrub' as const, label: 'Scrub' },
    { category: 'test' as const, label: 'Test' },
    { category: 'review' as const, label: 'Review' },
    { category: 'git' as const, label: 'Merge' },
  ];

  constructor() {
    // Live playhead progression loop
    this.timer = setInterval(() => {
      if (this.isRunning()) {
        this.currentPlayheadMs.update((ms) => ms + 100);
      }
    }, 100);

    // Reset playhead on new task
    effect(() => {
      const _ = this.taskId();
      this.currentPlayheadMs.set(0);
      this.panOffsetMs.set(0);
      this.isFitted.set(true);
    });
  }

  public ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public readonly effectiveTotalMs = computed(() => {
    const fromInput = this.totalDurationMs();
    if (fromInput > 0) return Math.max(fromInput, this.currentPlayheadMs());
    const all = this.spans();
    if (all.length === 0) return Math.max(3000, this.currentPlayheadMs());
    const maxEnd = Math.max(...all.map((s) => s.startOffsetMs + s.durationMs));
    return Math.max(maxEnd, this.currentPlayheadMs(), 3000);
  });

  /**
   * Visible time window in milliseconds across the lane canvas width.
   * In Fit mode: scales window to fit total task duration while keeping playhead center-anchored.
   * In Full/Zoomed mode: scaled by zoomLevel, default 20s.
   */
  public readonly visibleWindowMs = computed(() => {
    if (this.isFitted()) {
      return Math.max(this.effectiveTotalMs(), this.currentPlayheadMs() * 2, 6000);
    }
    return Math.round(20000 / this.zoomLevel());
  });

  /**
   * Half of visible window representing the center line (50%).
   */
  public readonly halfWindowMs = computed(() => {
    return this.visibleWindowMs() / 2;
  });

  /**
   * Dynamic window start offset:
   * 1. If playhead <= halfWindowMs: windowStart = 0 (playhead advances from 0% to 50%).
   * 2. If playhead > halfWindowMs: windowStart = currentPlayheadMs - halfWindowMs (playhead locked at 50%).
   */
  public readonly windowStartMs = computed(() => {
    if (this.isFitted()) return 0;
    const playhead = this.currentPlayheadMs();
    const half = this.halfWindowMs();
    if (playhead <= half) return 0;
    return playhead - half;
  });

  public readonly effectiveStartMs = computed(() => {
    return Math.max(0, this.windowStartMs() + this.panOffsetMs());
  });

  public readonly effectiveEndMs = computed(() => {
    return this.effectiveStartMs() + this.visibleWindowMs();
  });

  /**
   * Playhead position percentage across the track lane:
   * 1. 0 to 50% as playhead advances from 0 to halfWindowMs.
   * 2. Firmly locked at 50% (center line) once playhead reaches halfWindowMs.
   *    Never exceeds 50%; never gets stuck at the right edge.
   */
  public readonly playheadPercent = computed(() => {
    const playhead = this.currentPlayheadMs();
    const half = this.halfWindowMs();
    const windowMs = this.visibleWindowMs();
    if (windowMs <= 0) return 0;
    if (playhead <= half) {
      return Math.min(50, Math.max(0, (playhead / windowMs) * 100));
    }
    return 50;
  });

  public getCenterGuidelineLeftStyle(): string {
    return 'calc(95px + (100% - 110px) * 0.5)';
  }

  public getPlayheadLeftStyle(): string {
    const pct = this.playheadPercent();
    return `calc(95px + (100% - 110px) * ${pct / 100})`;
  }

  public getSpansForCategory(category: GanttSpan['category']): GanttSpan[] {
    return this.spans().filter((s) => s.category === category);
  }

  public getDisplayDuration(span: GanttSpan): number {
    if (span.status === 'RUNNING' && this.isRunning()) {
      const live = Math.max(span.durationMs, this.currentPlayheadMs() - span.startOffsetMs);
      return Math.round(live);
    }
    return Math.round(span.durationMs);
  }

  public getSpanLeftPercent(span: GanttSpan): number {
    const windowMs = this.visibleWindowMs();
    if (windowMs <= 0) return 0;
    const start = this.effectiveStartMs();
    return ((span.startOffsetMs - start) / windowMs) * 100;
  }

  public getSpanWidthPercent(span: GanttSpan): number {
    const windowMs = this.visibleWindowMs();
    if (windowMs <= 0) return 0;
    const dur = this.getDisplayDuration(span);
    return Math.max(0.5, (dur / windowMs) * 100);
  }

  public formatTime(ms: number): string {
    const clamped = Math.max(0, Math.round(ms));
    if (clamped >= 60000) {
      const mins = Math.floor(clamped / 60000);
      const secs = ((clamped % 60000) / 1000).toFixed(1);
      return `${mins}m ${secs}s`;
    }
    if (clamped >= 10000) {
      return `${(clamped / 1000).toFixed(1)}s`;
    }
    return `${clamped}ms`;
  }

  public zoomIn(): void {
    this.isFitted.set(false);
    this.zoomLevel.update((z) => Math.min(4.0, Number((z + 0.5).toFixed(1))));
  }

  public zoomOut(): void {
    this.isFitted.set(false);
    this.zoomLevel.update((z) => Math.max(0.5, Number((z - 0.5).toFixed(1))));
  }

  public recenter(): void {
    this.panOffsetMs.set(0);
    this.isFitted.set(false);
  }

  public toggleFit(): void {
    this.isFitted.update((f) => !f);
    this.panOffsetMs.set(0);
  }

  public onMouseDown(e: MouseEvent): void {
    const el = this.canvasContainer()?.nativeElement;
    if (!el) return;
    this.isDragging.set(true);
    this.dragStartX = e.pageX;
    this.dragStartPanOffset = this.panOffsetMs();
  }

  public onMouseMove(e: MouseEvent): void {
    if (!this.isDragging()) return;
    const el = this.canvasContainer()?.nativeElement;
    if (!el) return;
    e.preventDefault();
    const laneWidth = Math.max(200, el.clientWidth - 110);
    const deltaPx = e.pageX - this.dragStartX;
    const deltaMs = (deltaPx / laneWidth) * this.visibleWindowMs();
    this.panOffsetMs.set(Math.round(this.dragStartPanOffset - deltaMs));
  }

  public onMouseUp(): void {
    this.isDragging.set(false);
  }
}
