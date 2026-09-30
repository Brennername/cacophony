import { Injectable, signal, computed } from '@angular/core';

export interface TelemetryMetrics {
  gpuBusyPercent: number;
  cpuBusyPercent: number;
  systemMemoryUsedMb: number;
  systemMemoryTotalMb: number;
  systemMemoryPercent: number;
  vramUsedMb: number;
  vramTotalMb: number;
  vramAvailMb: number;
  vramPercent: number;
  gttUsedMb: number;
  gttTotalMb: number;
  edgeTempCelsius: number;
  thermalZone: 'nominal' | 'warm' | 'elevated' | 'danger';
  vddgfxMv: number;
  socMv: number;
  vddnbMv: number;
  pptPowerW: number;
  sclkMhz: number;
  mclkMhz: number;
  activeModel: string;
}

export interface TaskStageItem {
  id: string;
  stageName: string;
  stageStatus: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  logOutput?: string | null;
}

export interface TaskItem {
  id: string;
  title: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'REMEDIATED';
  priority: 'P0' | 'P1' | 'P2';
  role: string;
  prompt?: string;
  modelAssigned?: string | null;
  testCommand?: string | null;
  focusFiles?: string | null;
  prUrl?: string | null;
  currentStage?: string;
  tokensPerSec?: number;
  logSnippet?: string;
  progressPercent?: number;
  stages?: TaskStageItem[];
}

export interface ProcessItem {
  id: string;
  command: string;
  durationMs: number;
  exitCode: number | null;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
}

/**
 * State store managing real-time arena diagnostics, task queues, and process telemetry with Signals.
 */
@Injectable({
  providedIn: 'root',
})
export class ArenaStateStore {
  // Live Terminal Stream Buffer (Raw combined output)
  public readonly liveStreamBuffer = signal<string>('');

  // Live Cognitive Trace (<think> tokens demuxed in real time)
  public readonly liveReasoningBuffer = signal<string>('');

  // Live Code Generation Stream (demuxed code and markdown artifacts)
  public readonly liveCodeBuffer = signal<string>('');

  // Live Instantaneous Token Velocity (tokens per second over rolling 2s window)
  public readonly liveTokenVelocity = signal<number>(0);

  // Cumulative Run Token Velocity (total tokens in current task run / elapsed generation seconds)
  public readonly runTokenVelocity = signal<number>(0);

  // Live Stream Activity: true when tokens are actively streaming from the LLM, false when paused or idle
  public readonly isStreamActive = signal<boolean>(false);

  // Velocity Match Status: reflects active LLM stream activity
  public readonly isVelocityMatched = computed(() => this.isStreamActive());

  private lastTokenReceivedAt = 0;
  private tokenArrivalTimestamps: number[] = [];
  private velocityDecayTimer: ReturnType<typeof setInterval> | null = null;
  private runTokenCount = 0;
  private runStartTimestamp: number | null = null;
  private currentTaskIdForRun: string | null = null;

  // Rolling Telemetry History for real-time sparkline graphs (up to 30 data points)
  public readonly tempHistory = signal<number[]>([35, 36, 38, 40, 42, 45, 47, 50, 52, 54]);
  public readonly gpuLoadHistory = signal<number[]>([0, 5, 12, 25, 40, 60, 75, 80, 85, 90]);
  public readonly vramHistory = signal<number[]>([15, 20, 25, 30, 35, 40, 45, 50, 52, 55]);
  public readonly gttHistory = signal<number[]>([5, 8, 10, 12, 15, 18, 20, 22, 25, 26]);
  public readonly cpuLoadHistory = signal<number[]>([10, 15, 22, 35, 45, 50, 40, 35, 30, 28]);
  public readonly sysMemHistory = signal<number[]>([30, 31, 32, 33, 34, 35, 36, 37, 38, 38]);

  // Model High-Water Mark and Velocity Statistics
  public readonly modelHighWaterMarks = signal<Record<string, number>>({});
  private readonly modelVelocitySamples = new Map<string, number[]>();

  public readonly activeModelHighWaterMark = computed(() => {
    const model = this.telemetry().activeModel;
    const recorded = this.modelHighWaterMarks()[model];
    if (recorded && recorded > 0) return recorded;
    const live = this.liveTokenVelocity();
    const run = this.runTokenVelocity();
    return Math.max(35.0, live * 1.25, run * 1.25);
  });

  // Selected Task for Drill-Down Modal
  public readonly selectedTask = signal<TaskItem | null>(null);

  // Telemetry Signal initialized with zero/clean state
  public readonly telemetry = signal<TelemetryMetrics>({
    gpuBusyPercent: 0,
    cpuBusyPercent: 0,
    systemMemoryUsedMb: 0,
    systemMemoryTotalMb: 16384,
    systemMemoryPercent: 0,
    vramUsedMb: 0,
    vramTotalMb: 16384,
    vramAvailMb: 16384,
    vramPercent: 0,
    gttUsedMb: 0,
    gttTotalMb: 16384,
    edgeTempCelsius: 0,
    thermalZone: 'nominal',
    vddgfxMv: 0,
    socMv: 0,
    vddnbMv: 0,
    pptPowerW: 0,
    sclkMhz: 0,
    mclkMhz: 0,
    activeModel: 'None',
  });

  // Task Queue Signals initialized empty from real backend
  public readonly tasks = signal<TaskItem[]>([]);

  // Process Monitor Signals initialized empty
  public readonly processes = signal<ProcessItem[]>([]);

  // Scheduler control signal
  public readonly schedulerPaused = signal<boolean>(false);

  // User Role & Permissions (ADMIN, OPERATOR, VIEWER)
  public readonly currentUserRole = signal<'ADMIN' | 'OPERATOR' | 'VIEWER'>('OPERATOR');

  public readonly canMutateTasks = computed(() => {
    const role = this.currentUserRole();
    return role === 'ADMIN' || role === 'OPERATOR';
  });

  public readonly isAdmin = computed(() => this.currentUserRole() === 'ADMIN');

  private eventSource: EventSource | null = null;

  constructor() {
    this.connectLiveStreams();
    this.fetchInitialState();
  }

  private appendHistory(sig: { update: (fn: (v: number[]) => number[]) => void }, val: number): void {
    sig.update((prev) => {
      const next = [...prev, val];
      return next.length > 30 ? next.slice(-30) : next;
    });
  }

  public recordModelVelocity(model: string, velocity: number): void {
    if (!model || model === 'None' || velocity <= 0) return;
    const samples = this.modelVelocitySamples.get(model) ?? [];
    samples.push(velocity);
    if (samples.length > 50) samples.shift();
    this.modelVelocitySamples.set(model, samples);

    const mean = samples.reduce((acc, v) => acc + v, 0) / samples.length;
    const variance = samples.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / samples.length;
    const stdDev = Math.sqrt(variance);

    // Filter outliers greater than 2 standard deviations from mean
    let effectiveVal = velocity;
    if (samples.length >= 10 && stdDev > 0 && velocity > mean + 2 * stdDev) {
      const validSamples = samples.filter((s) => s <= mean + 2 * stdDev);
      effectiveVal = validSamples.length > 0 ? Math.max(...validSamples) : mean;
    }

    const currentHwm = this.modelHighWaterMarks()[model] ?? 0;
    if (effectiveVal > currentHwm) {
      this.modelHighWaterMarks.update((prev) => ({
        ...prev,
        [model]: Number(effectiveVal.toFixed(1))
      }));
    }
  }

  private connectLiveStreams(): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    try {
      this.eventSource = new EventSource('/api/events');
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'telemetry') {
            const gpuBusy = data.gpuBusy ?? 0;
            const cpuBusy = data.cpuBusyPercent ?? 0;
            const temp = data.edgeTempCelsius ?? 0;
            const vramPct = data.vramPercent ?? (data.vramTotalMb ? Number(((data.vramUsedMb / data.vramTotalMb) * 100).toFixed(1)) : 0);
            const gttPct = data.gttTotalMb ? Number(((data.gttUsedMb / data.gttTotalMb) * 100).toFixed(1)) : 0;
            const sysMemPct = data.systemMemoryPercent ?? 0;

            this.telemetry.set({
              gpuBusyPercent: gpuBusy,
              cpuBusyPercent: cpuBusy,
              systemMemoryUsedMb: data.systemMemoryUsedMb ?? 0,
              systemMemoryTotalMb: data.systemMemoryTotalMb ?? 16384,
              systemMemoryPercent: sysMemPct,
              vramUsedMb: data.vramUsedMb ?? 0,
              vramTotalMb: data.vramTotalMb ?? 16384,
              vramAvailMb: data.vramAvailMb ?? Math.max(0, (data.vramTotalMb ?? 16384) - (data.vramUsedMb ?? 0)),
              vramPercent: vramPct,
              gttUsedMb: data.gttUsedMb ?? 0,
              gttTotalMb: data.gttTotalMb ?? 16384,
              edgeTempCelsius: temp,
              thermalZone: data.thermalZone ?? 'nominal',
              vddgfxMv: data.vddgfxMv ?? 0,
              socMv: data.socMv ?? 0,
              vddnbMv: data.vddnbMv ?? data.socMv ?? 0,
              pptPowerW: data.pptPowerW ?? 0,
              sclkMhz: data.sclkMhz ?? 0,
              mclkMhz: data.mclkMhz ?? 0,
              activeModel: data.activeModel ?? 'None',
            });

            this.appendHistory(this.tempHistory, temp);
            this.appendHistory(this.gpuLoadHistory, gpuBusy);
            this.appendHistory(this.cpuLoadHistory, cpuBusy);
            this.appendHistory(this.vramHistory, vramPct);
            this.appendHistory(this.gttHistory, gttPct);
            this.appendHistory(this.sysMemHistory, sysMemPct);
          }
          if (data.type === 'stream_init') {
            if (data.buffer) {
              this.liveStreamBuffer.set(data.buffer);
            }
            if (data.taskId) {
              this.currentTaskIdForRun = data.taskId;
              this.runTokenCount = 0;
              this.runStartTimestamp = null;
              this.runTokenVelocity.set(0);
              this.tokenArrivalTimestamps = [];
              this.liveTokenVelocity.set(0);
              this.lastTokenReceivedAt = 0;
              this.isStreamActive.set(false);
            }
          }
          if (data.type === 'token') {
            const token = data.token ?? '';
            const taskId = data.taskId ?? this.activeTask()?.id ?? null;
            if (taskId && taskId !== this.currentTaskIdForRun) {
              this.currentTaskIdForRun = taskId;
              this.liveStreamBuffer.set('');
              this.liveReasoningBuffer.set('');
              this.liveCodeBuffer.set('');
              this.runTokenCount = 0;
              this.runStartTimestamp = null;
              this.runTokenVelocity.set(0);
              this.tokenArrivalTimestamps = [];
              this.liveTokenVelocity.set(0);
              this.lastTokenReceivedAt = 0;
              this.isStreamActive.set(false);
            }

            this.liveStreamBuffer.update((prev) => {
              const updated = prev + token;
              return updated.length > 25000 ? updated.slice(-25000) : updated;
            });

            const now = Date.now();
            this.lastTokenReceivedAt = now;
            this.isStreamActive.set(true);

            // Active streaming tokens guarantee that the task has advanced past planning into generation
            if (taskId) {
              this.tasks.update((currentTasks) =>
                currentTasks.map((t) => {
                  if (t.id !== taskId) return t;
                  if (t.currentStage !== 'generation') {
                    const existingStages = t.stages ? [...t.stages] : [];
                    const planIdx = existingStages.findIndex((s) => s.stageName === 'planning');
                    if (planIdx >= 0) {
                      existingStages[planIdx] = {
                        ...existingStages[planIdx]!,
                        stageStatus: 'SUCCESS',
                        completedAt: existingStages[planIdx]!.completedAt || new Date().toISOString()
                      };
                    } else {
                      existingStages.push({
                        id: `${taskId}-planning`,
                        stageName: 'planning',
                        stageStatus: 'SUCCESS',
                        startedAt: new Date().toISOString(),
                        completedAt: new Date().toISOString(),
                        durationMs: 500
                      });
                    }

                    const genIdx = existingStages.findIndex((s) => s.stageName === 'generation');
                    if (genIdx >= 0) {
                      existingStages[genIdx] = {
                        ...existingStages[genIdx]!,
                        stageStatus: 'RUNNING'
                      };
                    } else {
                      existingStages.push({
                        id: `${taskId}-generation`,
                        stageName: 'generation',
                        stageStatus: 'RUNNING',
                        startedAt: new Date().toISOString(),
                        completedAt: null,
                        durationMs: null
                      });
                    }

                    return {
                      ...t,
                      currentStage: 'generation',
                      stages: existingStages
                    };
                  }
                  return t;
                })
              );
            }

            if (this.runStartTimestamp === null) {
              this.runStartTimestamp = now;
            }
            this.runTokenCount++;
            const elapsedRunSec = Math.max(0.5, (now - this.runStartTimestamp) / 1000);
            const runVelocity = Number((this.runTokenCount / elapsedRunSec).toFixed(1));
            this.runTokenVelocity.set(runVelocity);

            // Calculate rolling token velocity over a 2-second sliding window
            this.tokenArrivalTimestamps.push(now);
            const cutoff = now - 2000;
            this.tokenArrivalTimestamps = this.tokenArrivalTimestamps.filter((t) => t >= cutoff);
            const count = this.tokenArrivalTimestamps.length;
            const velocity = count > 1 ? Number((count / 2.0).toFixed(1)) : (count === 1 ? 1.0 : 0.0);
            this.liveTokenVelocity.set(velocity);
            this.recordModelVelocity(this.telemetry().activeModel, velocity);
          }
          if (data.type === 'reasoning_chunk') {
            const chunk = data.chunk ?? '';
            if (chunk) {
              this.liveReasoningBuffer.update((prev) => {
                const updated = prev + chunk;
                return updated.length > 25000 ? updated.slice(-25000) : updated;
              });
            }
          }
          if (data.type === 'code_chunk') {
            const chunk = data.chunk ?? '';
            if (chunk) {
              this.liveCodeBuffer.update((prev) => {
                const updated = prev + chunk;
                return updated.length > 25000 ? updated.slice(-25000) : updated;
              });
            }
          }
          if (data.type === 'stage_transition') {
            const taskId = data.taskId;
            const stageName = data.stageName;
            const stageStatus = data.stageStatus;
            const durationMs = data.durationMs ?? null;

            this.tasks.update((currentTasks) =>
              currentTasks.map((t) => {
                if (t.id !== taskId) return t;
                const existingStages = t.stages ? [...t.stages] : [];
                const stageIndex = existingStages.findIndex((s) => s.stageName === stageName);
                if (stageIndex >= 0) {
                  existingStages[stageIndex] = {
                    ...existingStages[stageIndex]!,
                    stageStatus,
                    durationMs: durationMs ?? existingStages[stageIndex]!.durationMs,
                    completedAt: stageStatus === 'SUCCESS' || stageStatus === 'FAILURE' ? new Date().toISOString() : null,
                  };
                } else {
                  existingStages.push({
                    id: `${taskId}-${stageName}`,
                    stageName,
                    stageStatus,
                    startedAt: new Date().toISOString(),
                    completedAt: stageStatus === 'SUCCESS' || stageStatus === 'FAILURE' ? new Date().toISOString() : null,
                    durationMs,
                  });
                }

                return {
                  ...t,
                  currentStage: stageStatus === 'RUNNING' ? stageName : (t.currentStage || stageName),
                  stages: existingStages,
                };
              })
            );
          }
        } catch {
          // ignore stream parse errors
        }
      };

      // Velocity decay timer: resets live velocity toward 0 and updates stream activity
      this.velocityDecayTimer = setInterval(() => {
        const now = Date.now();
        const timeSinceLastToken = now - this.lastTokenReceivedAt;
        if (this.lastTokenReceivedAt > 0 && timeSinceLastToken < 1200) {
          this.isStreamActive.set(true);
        } else {
          this.isStreamActive.set(false);
        }

        const cutoff = now - 2000;
        this.tokenArrivalTimestamps = this.tokenArrivalTimestamps.filter((t) => t >= cutoff);
        if (this.tokenArrivalTimestamps.length === 0) {
          if (this.liveTokenVelocity() > 0) {
            this.liveTokenVelocity.set(0);
          }
        } else {
          const count = this.tokenArrivalTimestamps.length;
          const velocity = Number((count / 2.0).toFixed(1));
          this.liveTokenVelocity.set(velocity);
        }
      }, 200);

      // Periodic poll every 2.5 seconds to refresh task statuses and process metrics
      setInterval(() => {
        void this.fetchInitialState();
      }, 2500);
    } catch {
      // offline / mock environment
    }
  }

  public async fetchInitialState(): Promise<void> {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const rawTasks = await res.json() as Array<{
          id: string;
          title: string;
          status: string;
          priority: string;
          role: string;
          prompt?: string;
          modelAssigned?: string | null;
          testCommand?: string | null;
          focusFiles?: string | null;
          prUrl?: string | null;
        }>;
        const items: TaskItem[] = rawTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: (t.status as TaskItem['status']) || 'PENDING',
          priority: (t.priority as TaskItem['priority']) || 'P1',
          role: t.role || 'implementer',
          prompt: t.prompt,
          modelAssigned: t.modelAssigned,
          testCommand: t.testCommand,
          focusFiles: t.focusFiles,
          prUrl: t.prUrl,
        }));
        if (items.length > 0) {
          this.tasks.update((existingList) => {
            const existingMap = new Map(existingList.map((e) => [e.id, e]));
            return items.map((newItem) => {
              const old = existingMap.get(newItem.id);
              return {
                ...newItem,
                currentStage: old?.currentStage,
                stages: old?.stages ?? [],
                progressPercent: old?.progressPercent
              };
            });
          });
        }
      }
    } catch {
      // offline
    }

    // Hydrate real stages for active running task from /api/tasks/:id
    const active = this.tasks().find((t) => t.status === 'RUNNING');
    if (active) {
      try {
        const detailRes = await fetch(`/api/tasks/${active.id}`);
        if (detailRes.ok) {
          const detail = (await detailRes.json()) as { stages?: TaskStageItem[] };
          if (detail.stages && detail.stages.length > 0) {
            const runningStage = detail.stages.slice().reverse().find((s) => s.stageStatus === 'RUNNING');
            const lastStage = detail.stages[detail.stages.length - 1];
            const activeStageName = runningStage?.stageName || lastStage?.stageName;

            this.tasks.update((list) =>
              list.map((t) => {
                if (t.id !== active.id) return t;
                return {
                  ...t,
                  currentStage: activeStageName || t.currentStage,
                  stages: detail.stages,
                };
              })
            );
          }
        }
      } catch {
        // ignore
      }
    }

    try {
      const procRes = await fetch('/api/processes');
      if (procRes.ok) {
        const rawProcs = await procRes.json() as ProcessItem[];
        if (rawProcs.length > 0) {
          this.processes.set(rawProcs);
        }
      }
    } catch {
      // offline
    }
  }

  // Computed Selectors
  public readonly activeTask = computed(() =>
    this.tasks().find((t) => t.status === 'RUNNING')
  );

  public readonly pendingCount = computed(
    () => this.tasks().filter((t) => t.status === 'PENDING').length
  );

  public readonly completedCount = computed(
    () => this.tasks().filter((t) => t.status === 'COMPLETED').length
  );

  // Actions
  public toggleScheduler(): void {
    this.schedulerPaused.update((paused) => !paused);
  }

  public moveTaskPriority(taskId: string, direction: 'up' | 'down'): void {
    this.tasks.update((items) => {
      const index = items.findIndex((t) => t.id === taskId);
      if (index < 0) return items;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= items.length) return items;

      const newItems = [...items];
      const temp = newItems[index]!;
      newItems[index] = newItems[targetIndex]!;
      newItems[targetIndex] = temp;
      return newItems;
    });
  }

  public addTask(title: string, priority: 'P0' | 'P1' | 'P2'): void {
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title,
      status: 'PENDING',
      priority,
      role: 'implementer',
    };
    this.tasks.update((items) => [newTask, ...items]);
  }

  public async selectTask(taskOrId: TaskItem | string): Promise<void> {
    const taskId = typeof taskOrId === 'string' ? taskOrId : taskOrId.id;
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const fullTask = await res.json() as TaskItem;
        this.selectedTask.set(fullTask);
        return;
      }
    } catch {
      // fallback
    }

    if (typeof taskOrId !== 'string') {
      this.selectedTask.set(taskOrId);
    } else {
      const found = this.tasks().find((t) => t.id === taskId);
      this.selectedTask.set(found || null);
    }
  }

  public clearSelectedTask(): void {
    this.selectedTask.set(null);
  }
}
