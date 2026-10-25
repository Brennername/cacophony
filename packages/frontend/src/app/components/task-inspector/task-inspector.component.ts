import { Component, inject, effect, viewChild, ElementRef, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArenaStateStore, type TaskItem } from '../../services/arena-state.store';
import { StageProgressBarComponent, type StageStepInfo } from '../stage-progress-bar/stage-progress-bar.component';
import { GanttTransportComponent, type GanttSpan } from '../gantt-transport/gantt-transport.component';
import { TaskApiService } from '../../services/task-api.service';
import { ansiToHtml } from '../../utils/ansi-to-html';
import { sanitizeGiteaUrl } from '../../utils/url-normalizer';

export interface StageTabEntry {
  readonly id: string;
  readonly stageName: string;
  readonly label: string;
  readonly status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILURE';
  readonly durationMs: number | null;
  readonly logContent: string;
  readonly channelKey: string;
  readonly badgeClass: string;
  readonly themeClass: string;
}

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
  public readonly sanitizePrUrl = sanitizeGiteaUrl;
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
  public readonly activeStreamChannel = signal<string>('combined');
  public readonly viewMode = signal<'tabs' | 'accordion' | 'combined'>('tabs');
  public readonly autoFollow = signal<boolean>(true);
  public readonly terminalHeight = signal<number>(380);
  public readonly expandedAccordionStages = signal<Record<string, boolean>>({});

  public readonly stageTabsScrollRef = viewChild<ElementRef<HTMLDivElement>>('stageTabsScroll');
  public readonly canScrollStageTabsLeft = signal<boolean>(false);
  public readonly canScrollStageTabsRight = signal<boolean>(false);

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

  // T88.2.4: Assessment round, assessor model, verdict, findings, evidence, CI outcome, and queue stage
  public readonly workItemId = computed(() => this.activeTask()?.workItemId ?? null);
  public readonly lineageStage = computed(() => this.activeTask()?.lineageStage ?? this.activeTask()?.currentStage ?? 'implementation');
  public readonly assessmentRound = computed(() => this.activeTask()?.assessmentRound ?? 1);
  public readonly assessorModel = computed(() => this.activeTask()?.assessorModel ?? 'Independent Reviewer Pool');
  public readonly assessmentVerdict = computed(() => this.activeTask()?.assessmentVerdict ?? (this.activeTask()?.status === 'COMPLETED' ? 'APPROVED' : 'IN_REVIEW'));
  public readonly ciOutcome = computed(() => this.activeTask()?.ciOutcome ?? (this.activeTask()?.status === 'FAILED' ? 'FAILED' : 'PASSED'));
  public readonly findingsCount = computed(() => this.activeTask()?.findingsCount ?? (this.activeTask()?.findingIds?.length ?? 0));
  public readonly criticalCount = computed(() => this.activeTask()?.criticalCount ?? 0);
  public readonly headShaShort = computed(() => {
    const sha = this.activeTask()?.headSha;
    return sha ? sha.slice(0, 8) : null;
  });
  public readonly hasPrDetails = computed(() => {
    const t = this.activeTask();
    return Boolean(t?.prUrl || t?.targetBranch || t?.workItemId || t?.assessmentRound);
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

  public readonly allStageEntries = computed<StageTabEntry[]>(() => {
    const task = this.activeTask();
    if (!task) return [];
    const stages = task.stages ?? [];
    const pipeline = this.pipelineSteps();

    const stageNameMap: Record<string, { label: string; themeClass: string }> = {
      planning: { label: 'Planning', themeClass: 'stage-theme-plan' },
      generation: { label: 'Generation', themeClass: 'stage-theme-generation' },
      deterministic_scrub: { label: 'AST Scrub', themeClass: 'stage-theme-ast' },
      test_execution: { label: 'Test Execution', themeClass: 'stage-theme-test' },
      remediation: { label: 'Code Review', themeClass: 'stage-theme-review' },
      pr_review: { label: 'PR & Merge', themeClass: 'stage-theme-pr' },
    };

    if (stages.length > 0) {
      const occurrenceCount: Record<string, number> = {};
      return stages.map((s, idx) => {
        const info = stageNameMap[s.stageName] || { label: s.stageName, themeClass: 'stage-theme-generic' };
        occurrenceCount[s.stageName] = (occurrenceCount[s.stageName] || 0) + 1;
        const attempt = occurrenceCount[s.stageName];
        const attemptSuffix = attempt > 1 ? ` (Attempt ${attempt})` : '';

        const isRunningStage = s.stageStatus === 'RUNNING';
        let logContent = s.logOutput || '';
        if (s.stageName === 'generation') {
          if (isRunningStage) {
            logContent = this.displayedStreamBuffer() || s.logOutput || task.logSnippet || '// Awaiting model code generation...';
          } else {
            logContent = s.logOutput || '// No generation output recorded for this attempt.';
          }
        } else if (s.stageName === 'test_execution') {
          if (isRunningStage) {
            logContent = this.liveTestOutput() || s.logOutput || '// Awaiting test runner stdout/stderr stream...';
          } else {
            logContent = s.logOutput || '// No test runner output recorded for this attempt.';
          }
        } else if (s.stageName === 'deterministic_scrub') {
          if (isRunningStage) {
            logContent = this.liveAstScrubbing() || s.logOutput || '// Awaiting deterministic AST rule engine & diagnostic repairs...';
          } else {
            logContent = s.logOutput || '// No AST scrubbing log recorded for this attempt.';
          }
        } else if (s.stageName === 'remediation') {
          if (isRunningStage) {
            logContent = this.liveReviewCritique() || s.logOutput || '// Awaiting PR review evaluation & gate status...';
          } else {
            logContent = s.logOutput || '// No review critique recorded for this attempt.';
          }
        } else if (s.stageName === 'pr_review') {
          logContent = s.logOutput || (task.prUrl ? `Pull Request: ${task.prUrl}\nTarget Base: ${task.targetBranch || 'main'}` : '// Awaiting PR review & merge verification...');
        } else if (s.stageName === 'planning') {
          logContent = s.logOutput || (task.focusFiles ? `Focus files:\n${task.focusFiles}` : '// Planning directives verified');
        }

        const status = (s.stageStatus as 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILURE') || 'PENDING';

        const isDuplicateId = Boolean(s.id && stages.filter((other) => other.id === s.id).length > 1);
        const uniqueKey = s.id
          ? (isDuplicateId ? `stage-${s.id}-${attempt}` : `stage-${s.id}`)
          : `stage-${s.stageName}-${idx}`;

        return {
          id: uniqueKey,
          stageName: s.stageName,
          label: `${info.label}${attemptSuffix}`,
          status,
          durationMs: s.durationMs ?? null,
          logContent,
          channelKey: uniqueKey,
          badgeClass: `badge-${status.toLowerCase()}`,
          themeClass: info.themeClass,
        };
      });
    }

    return pipeline.map((step, idx) => {
      const info = stageNameMap[step.name] || { label: step.label, themeClass: 'stage-theme-generic' };
      let logContent = '';
      if (step.name === 'generation') {
        logContent = this.displayedStreamBuffer() || task.logSnippet || '// Awaiting model code generation...';
      } else if (step.name === 'test_execution') {
        logContent = this.liveTestOutput() || '// Awaiting test runner stdout/stderr stream...';
      } else if (step.name === 'deterministic_scrub') {
        logContent = this.liveAstScrubbing() || '// Awaiting deterministic AST rule engine repairs...';
      } else if (step.name === 'remediation') {
        logContent = this.liveReviewCritique() || '// Awaiting PR review evaluation...';
      } else if (step.name === 'planning') {
        logContent = task.focusFiles ? `Focus files:\n${task.focusFiles}` : '// Planning completed';
      } else if (step.name === 'pr_review') {
        logContent = task.prUrl ? `Pull Request: ${task.prUrl}` : '// Awaiting PR merge...';
      }

      return {
        id: `pipeline-${step.name}`,
        stageName: step.name,
        label: `${idx + 1}/6 ${info.label}`,
        status: step.status,
        durationMs: step.durationMs,
        logContent,
        channelKey: step.name,
        badgeClass: `badge-${step.status.toLowerCase()}`,
        themeClass: info.themeClass,
      };
    });
  });

  public readonly combinedStreamLog = computed<string>(() => {
    const task = this.activeTask();
    if (!task) return '';
    const entries = this.allStageEntries();
    if (entries.length === 0) {
      return this.displayedStreamBuffer() || task.logSnippet || 'No execution logs available.';
    }

    if (this.isStreamActive() && this.liveStreamBuffer().length > 0) {
      return this.displayedStreamBuffer();
    }

    const sections = entries
      .filter((e) => e.logContent && e.logContent.trim().length > 0 && !e.logContent.startsWith('// Awaiting'))
      .map((e) => {
        const dur = e.durationMs !== null && e.durationMs > 0 ? ` (${(e.durationMs / 1000).toFixed(2)}s)` : '';
        return `=== [${e.label.toUpperCase()}] Status: ${e.status}${dur} ===\n${e.logContent.trim()}`;
      });

    if (sections.length > 0) {
      return sections.join('\n\n');
    }

    return this.displayedStreamBuffer() || task.logSnippet || 'Streaming tokens...';
  });

  public readonly currentChannelLogContent = computed<string>(() => {
    const ch = this.activeStreamChannel();
    const task = this.activeTask();
    if (!task) return '// No task selected';

    if (ch === 'cognitive') {
      return this.liveReasoningBuffer() || '// Awaiting cognitive trace from reasoning model...';
    }
    if (ch === 'testing') {
      const testStage = (task.stages ?? []).slice().reverse().find((s) => s.stageName === 'test_execution');
      return this.liveTestOutput() || testStage?.logOutput || '// Awaiting test runner stdout/stderr stream...';
    }
    if (ch === 'ast') {
      const astStage = (task.stages ?? []).slice().reverse().find((s) => s.stageName === 'deterministic_scrub');
      return this.liveAstScrubbing() || astStage?.logOutput || '// Awaiting deterministic AST rule engine & diagnostic repairs...';
    }
    if (ch === 'review') {
      const revStage = (task.stages ?? []).slice().reverse().find((s) => s.stageName === 'remediation');
      return this.liveReviewCritique() || revStage?.logOutput || '// Awaiting PR review evaluation & gate status...';
    }
    if (ch === 'combined') {
      if (this.isStreamActive() && this.liveStreamBuffer().length > 0) {
        return this.displayedStreamBuffer();
      }
      return this.combinedStreamLog();
    }

    const matchedEntry = this.allStageEntries().find((e) => e.id === ch || e.channelKey === ch);
    if (matchedEntry) {
      return matchedEntry.logContent || '// No log output recorded for this stage.';
    }

    const nameMatches = this.allStageEntries().filter((e) => e.stageName === ch);
    if (nameMatches.length > 0) {
      const running = nameMatches.find((e) => e.status === 'RUNNING');
      return (running ?? nameMatches[nameMatches.length - 1]).logContent || '// No log output recorded for this stage.';
    }

    return this.displayedStreamBuffer() || task.logSnippet || 'Streaming tokens...';
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
        // Re-evaluate stage tabs overflow whenever stages or viewMode changes
        const _ = this.allStageEntries();
        const __ = this.viewMode();
        setTimeout(() => this.checkStageTabsOverflow(), 60);
      });

    effect(() => {
      // Fetch buffer from backend if active task changes and liveStreamBuffer is currently empty
      const active = this.activeTask();
      if (active && !this.liveStreamBuffer() && active.status === 'RUNNING') {
        void this.fetchTaskBuffer(active.id);
      }
    });

    effect(() => {
      // Auto-follow active pipeline stage if enabled and task is running
      if (!this.autoFollow()) return;
      const task = this.activeTask();
      if (!task || task.status !== 'RUNNING') return;

      const steps = this.pipelineSteps();
      const runningStep = steps.find((s) => s.status === 'RUNNING');
      if (runningStep) {
        if (runningStep.name === 'generation') {
          if (this.liveReasoningBuffer().length > 0 && !this.liveStreamBuffer()) {
            this.activeStreamChannel.set('cognitive');
          } else {
            this.activeStreamChannel.set('combined');
          }
        } else if (runningStep.name === 'test_execution') {
          this.activeStreamChannel.set('testing');
        } else if (runningStep.name === 'deterministic_scrub') {
          this.activeStreamChannel.set('ast');
        } else if (runningStep.name === 'remediation' || runningStep.name === 'pr_review') {
          this.activeStreamChannel.set('review');
        }
      }
    });

    effect(() => {
      // Ensure full stage details are loaded if missing
      const active = this.activeTask();
      if (active && (!active.stages || active.stages.length === 0)) {
        void this.fetchTaskStages(active.id);
      }
    });
  }

  public selectStreamChannel(channel: string, userClick = false): void {
    this.activeStreamChannel.set(channel);
    if (userClick) {
      this.autoFollow.set(false);
    }
  }

  public toggleAutoFollow(): void {
    this.autoFollow.update((v) => !v);
  }

  public toggleStageAccordion(stageId: string): void {
    this.expandedAccordionStages.update((prev) => ({
      ...prev,
      [stageId]: !this.isStageAccordionOpen(stageId),
    }));
  }

  public isStageAccordionOpen(stageId: string): boolean {
    const explicit = this.expandedAccordionStages()[stageId];
    if (explicit !== undefined) return explicit;
    const entry = this.allStageEntries().find((e) => e.id === stageId);
    return entry ? entry.status === 'RUNNING' : false;
  }

  public isStageChipActive(stage: StageTabEntry): boolean {
    const ch = this.activeStreamChannel();
    if (ch === stage.channelKey || ch === stage.id) return true;
    if (ch === stage.stageName) {
      const matches = this.allStageEntries().filter((e) => e.stageName === stage.stageName);
      if (matches.length <= 1) return true;
      const running = matches.find((e) => e.status === 'RUNNING');
      return (running ?? matches[matches.length - 1]).id === stage.id;
    }
    return false;
  }

  public isLogReduced(logContent: string | null | undefined): boolean {
    if (!logContent) return false;
    return logContent.includes("The log of this has been reduced, this is it's histogram:");
  }

  public expandAllStages(): void {
    const updated: Record<string, boolean> = {};
    for (const e of this.allStageEntries()) {
      updated[e.id] = true;
    }
    this.expandedAccordionStages.set(updated);
  }

  public collapseAllStages(): void {
    const updated: Record<string, boolean> = {};
    for (const e of this.allStageEntries()) {
      updated[e.id] = false;
    }
    this.expandedAccordionStages.set(updated);
  }

  public formatDuration(ms: number | null): string {
    if (ms === null || ms === undefined || ms <= 0) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  public setTerminalHeight(pixels: number): void {
    this.terminalHeight.set(Math.max(180, Math.min(pixels, 1200)));
  }

  public onResizeMouseDown(event: MouseEvent): void {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = this.terminalHeight();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      this.terminalHeight.set(Math.max(180, Math.min(startHeight + deltaY, 1200)));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  public onResizeTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    const startY = event.touches[0].clientY;
    const startHeight = this.terminalHeight();

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1) return;
      const deltaY = moveEvent.touches[0].clientY - startY;
      this.terminalHeight.set(Math.max(180, Math.min(startHeight + deltaY, 1200)));
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
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

  private async fetchTaskStages(taskId: string): Promise<void> {
    try {
      const detailed = await this.taskApiService.fetchTaskWithStages(taskId);
      if (detailed && detailed.stages && detailed.stages.length > 0) {
        const curr = this.activeTask();
        if (curr && curr.id === taskId) {
          this.selectedTaskOverride.set({ ...curr, stages: detailed.stages });
        }
      }
    } catch {
      // non-fatal
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

    if (!task.stages || task.stages.length === 0) {
      await this.fetchTaskStages(task.id);
    }
  }

  /**
   * Evaluates if the stage tabs overflow horizontally to conditionally
   * reveal left/right scroll navigation buttons and eliminate native scrollbars.
   */
  public checkStageTabsOverflow(): void {
    const el = this.stageTabsScrollRef()?.nativeElement;
    if (!el) {
      this.canScrollStageTabsLeft.set(false);
      this.canScrollStageTabsRight.set(false);
      return;
    }
    const scrollLeft = el.scrollLeft;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    this.canScrollStageTabsLeft.set(scrollLeft > 2);
    this.canScrollStageTabsRight.set(scrollLeft < maxScrollLeft - 2);
  }

  public onStageTabsScroll(): void {
    this.checkStageTabsOverflow();
  }

  public scrollStageTabs(direction: 'left' | 'right'): void {
    const el = this.stageTabsScrollRef()?.nativeElement;
    if (!el) return;
    const delta = direction === 'left' ? -200 : 200;
    if (typeof el.scrollBy === 'function') {
      el.scrollBy({ left: delta, behavior: 'smooth' });
    } else {
      el.scrollLeft += delta;
    }
    setTimeout(() => this.checkStageTabsOverflow(), 250);
  }

  @HostListener('window:resize')
  public onWindowResize(): void {
    this.checkStageTabsOverflow();
  }

  /**
   * Translates vertical mouse wheel scroll over horizontal stage tabs bar
   * to horizontal scroll and updates overflow status.
   */
  public onStageTabsWheel(event: WheelEvent): void {
    const el = this.stageTabsScrollRef()?.nativeElement || (event.currentTarget as HTMLElement | null);
    if (el && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault();
      el.scrollLeft += event.deltaY;
      this.checkStageTabsOverflow();
    }
  }

  /**
   * Transforms raw log/stream output containing ANSI codes into safe, styled HTML.
   */
  public renderAnsi(text: string | null | undefined): string {
    return ansiToHtml(text);
  }

  public drillDown(task: TaskItem): void {
    void this.store.selectTask(task);
  }
}
