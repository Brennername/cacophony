import { Component, inject, effect, viewChild, ElementRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArenaStateStore, type TaskItem } from '../../services/arena-state.store';
import { StageProgressBarComponent, type StageStepInfo } from '../stage-progress-bar/stage-progress-bar.component';
import { GanttTransportComponent, type GanttSpan } from '../gantt-transport/gantt-transport.component';

/**
 * Visual stepper and Gantt transport tracking task pipeline progression:
 * 1/6 Planning through 6/6 PR Review with intra-stage token velocity.
 */
@Component({
  selector: 'app-task-inspector',
  standalone: true,
  imports: [CommonModule, StageProgressBarComponent, GanttTransportComponent],
  template: `
    <div class="cacophony-card inspector-card">
      <div class="header-row">
        <div>
          <h2>Active Task Inspector</h2>
          <span class="subtext">Real-time LLM stage pipeline & token stream</span>
        </div>
        @if (activeTask(); as task) {
          <div class="speed-hud">
            <div class="speed-badge" [class.live-active]="isStreamActive()">
              <span class="hud-pill" [class.live]="isStreamActive()" [class.paused]="!isStreamActive()">
                {{ isStreamActive() ? 'LIVE' : 'PAUSED' }}
              </span>
              <div class="hud-metric">
                <span class="metric-caption"></span>
                <span class="num fixed-tks">{{ formattedLiveVelocity() }}</span>
              </div>
              <span class="hud-slash">/</span>
              <div class="hud-metric">
                <span class="metric-caption">RUN</span>
                <span class="num fixed-tks">{{ formattedRunVelocity() }}</span>
              </div>
              <span class="unit">tok/s</span>
            </div>
          </div>
        }
      </div>

      @if (activeTask(); as task) {
        <div class="task-info-banner clickable" (click)="drillDown(task)" title="Click to drill down into task details">
          <span class="badge priority">{{ task.priority }}</span>
          <span class="task-title">{{ task.title }}</span>
          <span class="badge model-badge font-mono">{{ activeTaskModel() }}</span>
          <span class="badge role">{{ task.role }}</span>
          <span class="drill-hint">Details ↗</span>
        </div>

        <!-- 6-Stage Granular Segmented Progress Bar -->
        <app-stage-progress-bar
          [progressPercent]="taskProgressPercent()"
          [tokensPerSec]="liveVelocity() > 0 ? liveVelocity() : runVelocity()"
          [runTokensPerSec]="runVelocity()"
          [isLive]="isStreamActive()"
          [currentStageNumber]="currentStageIndex() + 1"
          [activeStageLabel]="activeStageDisplayLabel()"
          [stages]="stageProgressBarItems()"
        />

        <!-- Stage Stepper Pipeline -->
        <div class="stepper-container">
          @for (step of pipelineSteps(); track step.name; let idx = $index; let last = $last) {
            <div
              class="step"
              [class.done]="step.status === 'SUCCESS'"
              [class.active]="step.status === 'RUNNING'"
              [class.failed]="step.status === 'FAILURE'"
            >
              <div class="circle">{{ idx + 1 }}</div>
              <span>{{ step.label }}</span>
            </div>
            @if (!last) {
              <div
                class="line"
                [class.done]="step.status === 'SUCCESS'"
              ></div>
            }
          }
        </div>

        <!-- Live Terminal Stream Preview -->
        <div class="terminal-box">
          <div class="terminal-bar">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
            <span class="terminal-title">live-llm-stream (task: {{ task.id }})</span>
            <button class="expand-btn" (click)="drillDown(task)">Expand Log</button>
          </div>
          <pre #terminalContent class="terminal-content"><code>{{ liveStreamBuffer() || task.logSnippet || 'Streaming tokens...' }}</code></pre>
        </div>

        <!-- Interactive Gantt Transport Timeline -->
        <app-gantt-transport
          [taskId]="activeTask()?.id ?? null"
          [modelName]="activeTaskModel()"
          [spans]="activeTaskSpans()"
          [totalDurationMs]="activeTaskTotalDuration()"
          [isRunning]="isStreamActive() || activeTask()?.status === 'RUNNING'"
        />
      } @else {
        <div class="empty-state">
          <p>No active tasks currently executing in the arena.</p>
          <span class="subtext">Scheduler is ready for incoming tasks.</span>
        </div>
      }
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

    .inspector-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      min-width: 0;
      max-width: 100%;
    }

    .subtext {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .speed-hud {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .speed-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.625rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      white-space: nowrap;
      transition: border-color 0.4s ease, box-shadow 0.4s ease;
    }

    .speed-badge.live-active {
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.2);
    }

    .hud-pill {
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
      text-transform: uppercase;
      min-width: 52px;
      text-align: center;
      transition: color 0.4s ease, background 0.4s ease, border-color 0.4s ease;
    }

    .hud-pill.live {
      background: rgba(16, 185, 129, 0.18);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.5);
      animation: gentle-live-breathe 2.4s ease-in-out infinite;
    }

    .hud-pill.paused {
      background: rgba(148, 163, 184, 0.12);
      color: var(--text-muted);
      border: 1px solid rgba(148, 163, 184, 0.25);
      animation: none;
    }

    @keyframes gentle-live-breathe {
      0%, 100% {
        opacity: 1;
        box-shadow: 0 0 6px rgba(16, 185, 129, 0.25);
      }
      50% {
        opacity: 0.8;
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.45);
      }
    }

    .hud-metric {
      display: inline-flex;
      align-items: baseline;
      gap: 0.2rem;
    }

    .metric-caption {
      font-size: 0.625rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .speed-badge .num {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum";
      font-weight: 700;
      color: var(--color-brand);
      font-size: 1rem;
      display: inline-block;
      min-width: 5.5ch;
      width: 5.5ch;
      text-align: right;
    }

    .speed-badge.matched .num {
      color: #10b981;
    }

    .hud-slash {
      font-size: 0.75rem;
      color: var(--border-strong);
      padding: 0 0.1rem;
    }

    .speed-badge .unit {
      font-size: 0.6875rem;
      color: var(--text-secondary);
      margin-left: 0.1rem;
    }

    .task-info-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--bg-surface-elevated);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      flex-wrap: wrap;
      min-width: 0;
      max-width: 100%;
    }

    .task-title {
      font-weight: 600;
      flex: 1 1 180px;
      font-size: 0.875rem;
      min-width: 0;
      word-break: break-word;
    }

    .badge {
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .badge.priority {
      background: var(--status-elevated);
      color: #ffffff;
    }

    .badge.role {
      background: var(--border-strong);
      color: var(--text-primary);
    }

    .badge.model-badge {
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid var(--color-accent);
      color: var(--color-accent);
      font-size: 0.6875rem;
    }

    /* Stepper */
    .stepper-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0;
      overflow-x: auto;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      -webkit-overflow-scrolling: touch;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      min-width: 50px;
    }

    .step span {
      font-size: 0.6875rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .step .circle {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--bg-surface-elevated);
      border: 2px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .step.done .circle {
      background: var(--status-nominal);
      border-color: var(--status-nominal);
      color: #ffffff;
    }

    .step.active .circle {
      border-color: var(--color-brand);
      color: var(--color-brand);
      box-shadow: 0 0 10px var(--color-brand-glow);
    }

    .step.active span {
      color: var(--color-brand);
      font-weight: 600;
    }

    .step.failed .circle {
      border-color: var(--status-danger);
      background: var(--status-danger);
      color: #ffffff;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
    }

    .step.failed span {
      color: var(--status-danger);
      font-weight: 600;
    }

    .line {
      flex: 1;
      height: 2px;
      background: var(--border-subtle);
      margin: 0 0.25rem 1rem 0.25rem;
    }

    .line.done {
      background: var(--status-nominal);
    }

    /* Terminal Box */
    .terminal-box {
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: #000000;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
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
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-left: 0.5rem;
    }

    .terminal-content {
      padding: 0.875rem;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: #38bdf8;
      white-space: pre-wrap;
      word-break: break-all;
      overflow-wrap: anywhere;
      max-height: 140px;
      overflow-y: auto;
      max-width: 100%;
      box-sizing: border-box;
    }

    .task-info-banner.clickable {
      cursor: pointer;
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }

    .task-info-banner.clickable:hover {
      background: var(--bg-surface);
      border-color: var(--color-brand);
    }

    .drill-hint {
      font-size: 0.75rem;
      color: var(--color-brand);
      font-weight: 600;
      margin-left: auto;
    }

    .expand-btn {
      margin-left: auto;
      background: transparent;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 0.6875rem;
      padding: 0.15rem 0.5rem;
      cursor: pointer;
      transition: color 0.15s ease, border-color 0.15s ease;
    }

    .expand-btn:hover {
      color: var(--color-brand);
      border-color: var(--color-brand);
    }

    .empty-state {
      padding: 2rem;
      text-align: center;
      color: var(--text-secondary);
    }
  `],
})
export class TaskInspectorComponent {
  private readonly store = inject(ArenaStateStore);
  public readonly activeTask = this.store.activeTask;
  public readonly liveStreamBuffer = this.store.liveStreamBuffer;

  public readonly liveVelocity = computed(() => this.store.liveTokenVelocity());
  public readonly runVelocity = computed(() => {
    const run = this.store.runTokenVelocity();
    if (run > 0) return run;
    return this.activeTask()?.tokensPerSec ?? 0;
  });
  public readonly isStreamActive = this.store.isStreamActive;
  public readonly isVelocityMatched = this.store.isVelocityMatched;

  public readonly formattedLiveVelocity = computed(() => {
    return this.liveVelocity().toFixed(1);
  });

  public readonly formattedRunVelocity = computed(() => {
    return this.runVelocity().toFixed(1);
  });

  public readonly currentVelocity = computed(() => {
    const liveVel = this.liveVelocity();
    if (liveVel > 0) return liveVel;
    return this.runVelocity();
  });

  public readonly activeTaskModel = computed(() => {
    return this.activeTask()?.modelAssigned || this.store.telemetry().activeModel || 'Auto-Assigned';
  });

  // Dynamic 6-stage pipeline stepper mapping
  public readonly pipelineSteps = computed(() => {
    const task = this.activeTask();
    const stageRecords = task?.stages ?? [];
    const isStreaming = this.isStreamActive() || (this.liveStreamBuffer().length > 0 && task?.status === 'RUNNING');

    const baseStages: Array<{ name: string; label: string }> = [
      { name: 'planning', label: 'Planning' },
      { name: 'generation', label: 'Generation' },
      { name: 'deterministic_scrub', label: 'Scrub' },
      { name: 'test_execution', label: 'Test' },
      { name: 'remediation', label: 'Review' },
      { name: 'pr_review', label: 'Merge' },
    ];

    return baseStages.map((stage) => {
      // Find the latest stage record for retried or multi-stage executions
      const match = stageRecords.slice().reverse().find((s) => s.stageName === stage.name);
      let status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILURE' = 'PENDING';
      let durationMs = match?.durationMs ?? null;

      if (match) {
        status = (match.stageStatus as 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILURE') || 'PENDING';
      }

      // If active token streaming is happening right now, we know for certain:
      // 1. Planning stage has finished with SUCCESS
      // 2. Generation stage is RUNNING
      if (isStreaming) {
        if (stage.name === 'planning') {
          status = 'SUCCESS';
          if (!durationMs || durationMs === 0) durationMs = 120;
        } else if (stage.name === 'generation') {
          status = 'RUNNING';
        }
      } else if (task?.currentStage === stage.name && status === 'PENDING') {
        status = 'RUNNING';
      }

      return {
        ...stage,
        status,
        durationMs,
      };
    });
  });

  public readonly currentStageIndex = computed(() => {
    const isStreaming = this.isStreamActive() || (this.liveStreamBuffer().length > 0 && this.activeTask()?.status === 'RUNNING');
    if (isStreaming) {
      return 1; // Stage 2: Generation
    }
    const steps = this.pipelineSteps();
    const activeIdx = steps.findIndex((s) => s.status === 'RUNNING');
    if (activeIdx >= 0) return activeIdx;
    const lastDoneIdx = steps.map((s) => s.status === 'SUCCESS').lastIndexOf(true);
    if (lastDoneIdx >= 0 && lastDoneIdx < steps.length - 1) return lastDoneIdx + 1;
    return Math.max(0, lastDoneIdx);
  });

  public readonly stageProgressBarItems = computed<StageStepInfo[]>(() => {
    const steps = this.pipelineSteps();
    return steps.map((step, idx) => ({
      index: idx + 1,
      name: step.name,
      label: `${idx + 1}/${steps.length} ${step.label}`,
      status: step.status,
      durationMs: step.durationMs ?? undefined,
    }));
  });

  public readonly activeStageDisplayLabel = computed(() => {
    const steps = this.pipelineSteps();
    const idx = this.currentStageIndex();
    const current = steps[idx];
    return current ? `${idx + 1}/${steps.length} ${current.label}` : '1/6 Planning';
  });

  public readonly taskProgressPercent = computed(() => {
    const task = this.activeTask();
    if (task?.progressPercent !== undefined) return task.progressPercent;
    const steps = this.pipelineSteps();
    const completed = steps.filter((s) => s.status === 'SUCCESS').length;
    if (completed === 0) return 10;
    return Math.min(100, Math.round((completed / steps.length) * 100));
  });

  public readonly activeTaskSpans = computed<GanttSpan[]>(() => {
    const task = this.activeTask();
    if (!task) return [];
    const steps = this.pipelineSteps();
    const isStreaming = this.isStreamActive() || (this.liveStreamBuffer().length > 0 && task?.status === 'RUNNING');

    const catMap: Record<string, GanttSpan['category']> = {
      planning: 'planning',
      generation: 'inference',
      deterministic_scrub: 'scrub',
      test_execution: 'test',
      remediation: 'review',
      pr_review: 'git',
    };

    let offset = 0;
    const spans: GanttSpan[] = [];

    for (const step of steps) {
      if (step.status === 'PENDING') continue;
      const cat = catMap[step.name] || 'inference';
      const dur = step.durationMs && step.durationMs > 0 ? step.durationMs : 1500;
      spans.push({
        id: `${task.id}-${step.name}`,
        name: step.label,
        category: cat,
        startOffsetMs: offset,
        durationMs: dur,
        status: step.status,
      });
      offset += dur;
    }

    if (spans.length === 0 || (spans.length === 1 && spans[0]?.category === 'planning' && isStreaming)) {
      const planDur = spans[0]?.durationMs || 500;
      return [
        {
          id: `${task.id}-planning`,
          name: 'Planning',
          category: 'planning',
          startOffsetMs: 0,
          durationMs: planDur,
          status: 'SUCCESS',
        },
        {
          id: `${task.id}-generation`,
          name: 'Generation',
          category: 'inference',
          startOffsetMs: planDur,
          durationMs: 3000,
          status: 'RUNNING',
        },
      ];
    }

    return spans;
  });

  public readonly activeTaskTotalDuration = computed<number>(() => {
    const spans = this.activeTaskSpans();
    if (spans.length === 0) return 3000;
    const last = spans[spans.length - 1];
    return Math.max(3000, last.startOffsetMs + last.durationMs);
  });

  private terminalContentEl = viewChild<ElementRef<HTMLElement>>('terminalContent');

  constructor() {
    effect(() => {
      // Whenever buffer changes, auto scroll to bottom
      const _ = this.liveStreamBuffer();
      const el = this.terminalContentEl()?.nativeElement;
      if (el) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      }
    });

    effect(() => {
      // Fetch buffer from backend if active task changes and liveStreamBuffer is currently empty
      const active = this.activeTask();
      if (active && !this.liveStreamBuffer()) {
        void this.fetchTaskBuffer(active.id);
      }
    });
  }

  private async fetchTaskBuffer(taskId: string): Promise<void> {
    try {
      const res = await fetch(`/api/stream/buffer?taskId=${encodeURIComponent(taskId)}`);
      if (res.ok) {
        const data = await res.json() as { buffer?: string };
        if (data.buffer && !this.liveStreamBuffer()) {
          this.store.liveStreamBuffer.set(data.buffer);
        }
      }
    } catch {
      // Ignore network errors
    }
  }

  public drillDown(task: TaskItem): void {
    void this.store.selectTask(task);
  }
}
