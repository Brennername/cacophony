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
  template: `
    <div class="cacophony-card gantt-card">
      <div class="transport-header">
        <div class="title-group">
          <h2>Execution Timeline</h2>
          <span class="subtext">
            {{ isRunning() ? 'LIVE STREAMING' : (effectiveTotalMs() > 0 ? 'COMPLETED' : 'IDLE') }}
            @if (modelName()) {
              • <span class="font-mono text-brand">{{ modelName() }}</span>
            }
            • {{ formatTime(currentPlayheadMs()) }} elapsed / {{ formatTime(effectiveTotalMs()) }} total
          </span>
        </div>

        <div class="transport-controls">
          <button class="transport-btn" (click)="zoomIn()" title="Zoom In scale">+</button>
          <span class="zoom-level font-mono">{{ zoomLevel() }}x</span>
          <button class="transport-btn" (click)="zoomOut()" title="Zoom Out scale">-</button>
          <button
            class="transport-btn"
            [class.active]="!isFitted() && panOffsetMs() === 0"
            (click)="recenter()"
            title="Lock playhead to center"
          >
            Center
          </button>
          <button
            class="transport-btn reset"
            [class.active]="isFitted()"
            (click)="toggleFit()"
            title="Toggle between fit in view and full scale"
          >
            {{ isFitted() ? 'Full' : 'Fit' }}
          </button>
        </div>
      </div>

      <!-- Top Timeline Latency Ruler with Waypoints -->
      <div class="timeline-ruler font-mono">
        <div class="ruler-waypoint" style="left: 0%">{{ formatTime(effectiveStartMs()) }}</div>
        <div class="ruler-waypoint" style="left: 25%">{{ formatTime(effectiveStartMs() + visibleWindowMs() * 0.25) }}</div>
        <div class="ruler-waypoint center-waypoint" style="left: 50%">
          {{ formatTime(effectiveStartMs() + visibleWindowMs() * 0.50) }}
        </div>
        <div class="ruler-waypoint" style="left: 75%">{{ formatTime(effectiveStartMs() + visibleWindowMs() * 0.75) }}</div>
        <div class="ruler-waypoint" style="left: 100%">{{ formatTime(effectiveEndMs()) }}</div>
      </div>

      <!-- Multi-Track Canvas with Drag-to-Pan Hand Navigation -->
      <div
        #canvasContainer
        class="tracks-canvas"
        [class.grabbing]="isDragging()"
        (mousedown)="onMouseDown($event)"
        (mousemove)="onMouseMove($event)"
        (mouseup)="onMouseUp()"
        (mouseleave)="onMouseUp()"
      >
        <div class="tracks-inner">
          <!-- Dedicated overlay positioned exactly over the track lanes (from 93px to 100%) -->
          <div class="lane-overlay">
            <!-- Center Alignment Guideline at 50% of the lane area -->
            <div class="center-guideline" style="left: 50%" title="Center Alignment Line (50%)">
              <span class="center-tag">CENTER</span>
            </div>

            <!-- Live Playhead Red Line (advances 0% to 50%, then locks in center) -->
            <div
              class="live-playhead"
              [style.left.%]="playheadPercent()"
              [title]="'Playhead: ' + currentPlayheadMs().toFixed(0) + 'ms'"
            >
              <div class="playhead-cap"></div>
              <div class="playhead-badge font-mono">{{ formatTime(currentPlayheadMs()) }}</div>
            </div>
          </div>

          <!-- Vertical Tracks -->
          @for (track of trackDefinitions; track track.category) {
            <div class="track-row">
              <div class="track-label-col">
                <span class="track-name">
                  {{ track.label }}
                  @if (track.category === 'inference' && modelName()) {
                    <span class="track-model-name font-mono">[{{ modelName() }}]</span>
                  }
                </span>
                <span class="track-sub">{{ track.category | uppercase }}</span>
              </div>

              <div class="track-lane">
                @for (span of getSpansForCategory(track.category); track span.id) {
                  <div
                    class="span-bar"
                    [ngClass]="[span.category, span.status.toLowerCase()]"
                    [style.left.%]="getSpanLeftPercent(span)"
                    [style.width.%]="getSpanWidthPercent(span)"
                    [title]="span.name + ' (' + getDisplayDuration(span) + 'ms) [' + span.status + ']'"
                  >
                    <span class="span-label">
                      {{ span.name }} ({{ getDisplayDuration(span) }}ms)
                    </span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
    }

    .gantt-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      position: relative;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }

    .transport-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .title-group {
      min-width: 0;
    }

    .title-group h2 {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .subtext {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
      word-break: break-word;
    }

    .transport-controls {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .transport-btn {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      border-radius: var(--radius-sm);
      padding: 0.2rem 0.5rem;
      font-size: 0.6875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
    }

    .transport-btn:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border-focus);
    }

    .transport-btn.active {
      background: rgba(59, 130, 246, 0.2);
      border-color: #3b82f6;
      color: #60a5fa;
    }

    .transport-btn.reset {
      font-size: 0.6875rem;
      padding: 0.2rem 0.55rem;
    }

    .zoom-level {
      font-size: 0.6875rem;
      color: var(--text-muted);
      min-width: 32px;
      text-align: center;
    }

    /* Timeline Latency Ruler */
    .timeline-ruler {
      position: relative;
      height: 18px;
      margin-left: 93px;
      margin-right: 0;
      border-bottom: 1px solid var(--border-subtle);
      font-size: 0.625rem;
      color: var(--text-muted);
      overflow: hidden;
      max-width: calc(100% - 93px);
      box-sizing: border-box;
    }

    .ruler-waypoint {
      position: absolute;
      transform: translateX(-50%);
      white-space: nowrap;
      top: 0;
    }

    .center-waypoint {
      color: #fca5a5;
      font-weight: 700;
    }

    /* Tracks Canvas & Hand Dragging */
    .tracks-canvas {
      position: relative;
      overflow-x: hidden;
      overflow-y: hidden;
      background: #000000;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.5rem;
      cursor: grab;
      user-select: none;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }

    .tracks-canvas.grabbing {
      cursor: grabbing;
    }

    .tracks-inner {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      min-height: 160px;
      width: 100%;
    }

    /* Dedicated Overlay matching exactly the position and width of .track-lane */
    .lane-overlay {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 93px;
      right: 0;
      pointer-events: none;
      z-index: 20;
    }

    /* Center Guideline (50% of the lane) */
    .center-guideline {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      transform: translateX(-50%);
      border-left: 1px dashed rgba(255, 255, 255, 0.25);
      pointer-events: none;
      z-index: 15;
    }

    .center-tag {
      position: absolute;
      bottom: 2px;
      left: 4px;
      font-size: 0.5rem;
      font-family: var(--font-mono);
      color: rgba(255, 255, 255, 0.35);
      letter-spacing: 0.05em;
    }

    /* Live Red Playhead Line */
    .live-playhead {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #ef4444;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.85), 0 0 2px #fff;
      z-index: 25;
      pointer-events: none;
      transition: left 0.08s linear;
    }

    .playhead-cap {
      position: absolute;
      top: -3px;
      left: -4px;
      width: 10px;
      height: 8px;
      background: #ef4444;
      clip-path: polygon(0% 0%, 100% 0%, 50% 100%);
    }

    .playhead-badge {
      position: absolute;
      top: -18px;
      left: 50%;
      transform: translateX(-50%);
      background: #ef4444;
      color: #ffffff;
      font-size: 0.5625rem;
      font-weight: 700;
      padding: 0.05rem 0.3rem;
      border-radius: 2px;
      white-space: nowrap;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    }

    /* Swimlane Track Rows */
    .track-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 26px;
    }

    .track-label-col {
      width: 85px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
    }

    .track-name {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .track-sub {
      font-size: 0.5625rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
      letter-spacing: 0.04em;
    }

    .track-lane {
      flex: 1;
      height: 22px;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 3px;
      position: relative;
      overflow: hidden;
    }

    /* Dynamic Gantt Stage Spans */
    .span-bar {
      position: absolute;
      height: 100%;
      border-radius: 2px;
      display: flex;
      align-items: center;
      padding: 0 0.4rem;
      font-size: 0.625rem;
      font-family: var(--font-mono);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: width 0.1s linear, left 0.1s linear;
    }

    .span-bar.running {
      animation: pulse-span 2s infinite ease-in-out;
    }

    @keyframes pulse-span {
      0%, 100% { opacity: 0.95; }
      50% { opacity: 0.70; }
    }

    .span-bar.planning {
      background: rgba(168, 85, 247, 0.35);
      border: 1px solid #a855f7;
      color: #e9d5ff;
    }

    .span-bar.inference {
      background: rgba(59, 130, 246, 0.35);
      border: 1px solid #3b82f6;
      color: #93c5fd;
    }

    .span-bar.scrub {
      background: rgba(6, 182, 212, 0.35);
      border: 1px solid #06b6d4;
      color: #a5f3fc;
    }

    .span-bar.test {
      background: rgba(245, 158, 11, 0.35);
      border: 1px solid #f59e0b;
      color: #fde68a;
    }

    .span-bar.review {
      background: rgba(249, 115, 22, 0.35);
      border: 1px solid #f97316;
      color: #fdba74;
    }

    .span-bar.git {
      background: rgba(16, 185, 129, 0.35);
      border: 1px solid #10b981;
      color: #6ee7b7;
    }

    .span-bar.failure {
      background: rgba(239, 68, 68, 0.4) !important;
      border-color: #ef4444 !important;
      color: #fca5a5 !important;
    }

    .span-label {
      font-weight: 500;
    }

    .track-model-name {
      font-size: 0.6875rem;
      color: var(--color-brand, #38bdf8);
      font-weight: 600;
      margin-left: 0.25rem;
    }
  `],
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
