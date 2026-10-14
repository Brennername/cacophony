import { Component, inject, effect, viewChild, ElementRef, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArenaStateStore, type TaskItem } from '../../services/arena-state.store';
import { StageProgressBarComponent, type StageStepInfo } from '../stage-progress-bar/stage-progress-bar.component';
import { GanttTransportComponent, type GanttSpan } from '../gantt-transport/gantt-transport.component';
import { TaskApiService } from '../../services/task-api.service';

/**
 * Visual stepper and Gantt transport tracking task pipeline progression:
 * 1/6 Planning through 6/6 PR Review with intra-stage token velocity.
 */
@Component({
  selector: 'app-task-inspector',
  standalone: true,
  imports: [CommonModule, StageProgressBarComponent, GanttTransportComponent],
  templateUrl: './task-inspector.component.html',
  styleUrl: './task-inspector.component.css',
})
export class TaskInspectorComponent {
  private readonly store = inject(ArenaStateStore);
  private readonly taskApiService = inject(TaskApiService);

  public readonly selectedTaskOverride = signal<TaskItem | null>(null);
  public readonly historicalStreamBuffer = signal<string | null>(null);

  public readonly activeTask = computed(
    () => this.selectedTaskOverride() || this.store.selectedTask() || this.store.activeTask(),
  );

  public readonly liveStreamBuffer = this.store.liveStreamBuffer;
  public readonly liveReasoningBuffer = this.store.liveReasoningBuffer;
  public readonly liveTestOutput = this.store.testOutputBuffer;
  public readonly liveAstScrubbing = this.store.astScrubbingBuffer;
  public readonly liveReviewCritique = this.store.reviewCritiqueBuffer;
  public readonly generationHeartbeat = this.store.generationHeartbeat;
  public readonly activeStreamChannel = signal<'combined' | 'cognitive' | 'testing' | 'ast' | 'review'>('combined');

  public readonly displayedStreamBuffer = computed(() => {
    const hist = this.historicalStreamBuffer();
    if (hist !== null && hist !== undefined) {
      return hist;
    }
    return this.liveStreamBuffer();
  });

  public readonly streamStatus = computed<'LIVE' | 'COMPLETED' | 'ARCHIVED' | 'PAUSED'>(() => {
    const task = this.activeTask();
    if (!task) return 'PAUSED';
    if (task.status === 'COMPLETED') return 'COMPLETED';
    if (task.status === 'FAILED' || task.status === 'CANCELLED') return 'ARCHIVED';
    if (this.isStreamActive()) return 'LIVE';
    return 'PAUSED';
  });

  public readonly heartbeatStatus = computed(() => {
    const hb = this.generationHeartbeat();
    if (!hb) return null;
    const task = this.activeTask();
    if (!task || task.status !== 'RUNNING') return null;

    if (hb.state === 'ingesting_prompt') {
      return {
        state: 'ingesting_prompt',
        label: `Ingesting Prompt (${(hb.elapsedMs / 1000).toFixed(1)}s)`,
        badgeClass: 'badge-ingesting'
      };
    }
    if (hb.state === 'stalled') {
      return {
        state: 'stalled',
        label: `Stall Warning (No output for ${(hb.idleMs / 1000).toFixed(1)}s)`,
        badgeClass: 'badge-stalled'
      };
    }
    if (hb.state === 'streaming') {
      return {
        state: 'streaming',
        label: `Streaming (${hb.instantaneousTps > 0 ? hb.instantaneousTps.toFixed(1) : this.formattedLiveVelocity()} tok/s)`,
        badgeClass: 'badge-streaming'
      };
    }
    return null;
  });

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
      // Whenever displayed buffer changes, auto scroll to bottom
      const _ = this.displayedStreamBuffer();
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
      if (active && !this.liveStreamBuffer() && active.status === 'RUNNING') {
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

  /**
   * Selects a task for inspection, switching to historical replay if completed/archived (T67.4.2).
   */
  public async selectTaskToInspect(task: TaskItem): Promise<void> {
    this.selectedTaskOverride.set(task);
    if (task.status === 'COMPLETED' || task.status === 'FAILED' || task.status === 'CANCELLED') {
      const replay = await this.taskApiService.replayStreamForTask(task.id);
      this.historicalStreamBuffer.set(replay);
    } else {
      this.historicalStreamBuffer.set(null);
    }
  }

  public drillDown(task: TaskItem): void {
    void this.store.selectTask(task);
  }
}
