import { Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface GanttSpan {
  id: number | string;
  name: string;
  category: 'inference' | 'test' | 'git' | 'scrub';
  startOffsetMs: number;
  durationMs: number;
  status: 'SUCCESS' | 'RUNNING' | 'FAILURE';
}

/**
 * Audio DAW-inspired horizontal Gantt transport timeline:
 * Stacked swimlanes for concurrent operations (model token streaming, background compiler test runs,
 * git commit creation), zoom controls, and interactive playhead scrubber.
 */
@Component({
  selector: 'app-gantt-transport',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cacophony-card gantt-card">
      <div class="transport-header">
        <div class="title-group">
          <h2>DAW Transport Timeline</h2>
          <span class="subtext">Multi-track latency & concurrency breakdown</span>
        </div>

        <div class="transport-controls">
          <button class="transport-btn" (click)="zoomIn()" title="Zoom In">+</button>
          <span class="zoom-level font-mono">{{ zoomLevel() }}x</span>
          <button class="transport-btn" (click)="zoomOut()" title="Zoom Out">-</button>
          <button class="transport-btn reset" (click)="resetPlayhead()">Playhead: 0ms</button>
        </div>
      </div>

      <!-- Timeline Ruler -->
      <div class="timeline-ruler font-mono">
        <span>0ms</span>
        <span>{{ totalDurationMs() / 4 }}ms</span>
        <span>{{ totalDurationMs() / 2 }}ms</span>
        <span>{{ (totalDurationMs() * 3) / 4 }}ms</span>
        <span>{{ totalDurationMs() }}ms</span>
      </div>

      <!-- Multi-Track Swimlanes -->
      <div class="tracks-container" (mousemove)="onTimelineHover($event)">
        <!-- Playhead Indicator Line -->
        <div class="playhead" [style.left.px]="playheadPos()"></div>

        <!-- Track 1: Model Token Streaming & Generation -->
        <div class="track-row">
          <span class="track-label">Inference</span>
          <div class="track-lane">
            @for (span of inferenceSpans(); track span.id) {
              <div
                class="span-bar inference"
                [style.left.%]="(span.startOffsetMs / totalDurationMs()) * 100 * zoomLevel()"
                [style.width.%]="(span.durationMs / totalDurationMs()) * 100 * zoomLevel()"
                [title]="span.name + ' (' + span.durationMs + 'ms)'"
              >
                <span class="span-text">{{ span.name }} ({{ span.durationMs }}ms)</span>
              </div>
            }
          </div>
        </div>

        <!-- Track 2: Automated Tests & Linters -->
        <div class="track-row">
          <span class="track-label">Test / LSP</span>
          <div class="track-lane">
            @for (span of testSpans(); track span.id) {
              <div
                class="span-bar test"
                [style.left.%]="(span.startOffsetMs / totalDurationMs()) * 100 * zoomLevel()"
                [style.width.%]="(span.durationMs / totalDurationMs()) * 100 * zoomLevel()"
                [title]="span.name + ' (' + span.durationMs + 'ms)'"
              >
                <span class="span-text">{{ span.name }} ({{ span.durationMs }}ms)</span>
              </div>
            }
          </div>
        </div>

        <!-- Track 3: Git Worktrees & PR Creation -->
        <div class="track-row">
          <span class="track-label">Git / PR</span>
          <div class="track-lane">
            @for (span of gitSpans(); track span.id) {
              <div
                class="span-bar git"
                [style.left.%]="(span.startOffsetMs / totalDurationMs()) * 100 * zoomLevel()"
                [style.width.%]="(span.durationMs / totalDurationMs()) * 100 * zoomLevel()"
                [title]="span.name + ' (' + span.durationMs + 'ms)'"
              >
                <span class="span-text">{{ span.name }} ({{ span.durationMs }}ms)</span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gantt-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .transport-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .subtext {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .transport-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .transport-btn {
      padding: 0.25rem 0.5rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      cursor: pointer;
      font-family: var(--font-mono);
      font-size: 0.75rem;
    }

    .transport-btn:hover {
      border-color: var(--border-strong);
    }

    .zoom-level {
      font-size: 0.75rem;
      color: var(--color-brand);
      min-width: 28px;
      text-align: center;
    }

    .timeline-ruler {
      display: flex;
      justify-content: space-between;
      font-size: 0.6875rem;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 0.25rem;
    }

    .tracks-container {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      overflow-x: auto;
      min-height: 120px;
      background: #000000;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.5rem;
    }

    .playhead {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #ef4444;
      pointer-events: none;
      z-index: 20;
    }

    .track-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 28px;
    }

    .track-label {
      width: 80px;
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-family: var(--font-mono);
    }

    .track-lane {
      flex: 1;
      height: 22px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 3px;
      position: relative;
      overflow: hidden;
    }

    .span-bar {
      position: absolute;
      height: 100%;
      border-radius: 2px;
      display: flex;
      align-items: center;
      padding: 0 0.5rem;
      font-size: 0.6875rem;
      font-family: var(--font-mono);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
    }

    .span-bar.inference {
      background: rgba(59, 130, 246, 0.35);
      border: 1px solid #3b82f6;
      color: #93c5fd;
    }

    .span-bar.test {
      background: rgba(16, 185, 129, 0.35);
      border: 1px solid #10b981;
      color: #6ee7b7;
    }

    .span-bar.git {
      background: rgba(245, 158, 11, 0.35);
      border: 1px solid #f59e0b;
      color: #fde68a;
    }

    .span-text {
      font-size: 0.625rem;
    }
  `],
})
export class GanttTransportComponent {
  public totalDurationMs = input<number>(4000);

  public spans = input<GanttSpan[]>([
    { id: 1, name: 'Qwen 2.5 Coder Generation', category: 'inference', startOffsetMs: 200, durationMs: 1800, status: 'SUCCESS' },
    { id: 2, name: 'node --test Verification', category: 'test', startOffsetMs: 2050, durationMs: 650, status: 'SUCCESS' },
    { id: 3, name: 'Git Commit & Checkpoint', category: 'git', startOffsetMs: 2750, durationMs: 320, status: 'SUCCESS' },
  ]);

  public zoomLevel = signal<number>(1.0);
  public playheadPos = signal<number>(100);

  public readonly inferenceSpans = computed(() =>
    this.spans().filter((s) => s.category === 'inference')
  );

  public readonly testSpans = computed(() =>
    this.spans().filter((s) => s.category === 'test')
  );

  public readonly gitSpans = computed(() =>
    this.spans().filter((s) => s.category === 'git')
  );

  public zoomIn(): void {
    this.zoomLevel.update((z) => Math.min(z + 0.5, 3.0));
  }

  public zoomOut(): void {
    this.zoomLevel.update((z) => Math.max(z - 0.5, 0.5));
  }

  public resetPlayhead(): void {
    this.playheadPos.set(0);
  }

  public onTimelineHover(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    this.playheadPos.set(Math.max(0, x));
  }
}
