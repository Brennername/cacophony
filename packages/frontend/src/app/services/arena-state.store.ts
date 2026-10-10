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
  targetBranch?: string | null;
  currentStage?: string;
  tokensPerSec?: number;
  logSnippet?: string;
  progressPercent?: number;
  stages?: TaskStageItem[];
  createdAt?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
}

export interface ProcessItem {
  id: string;
  command: string;
  durationMs: number;
  exitCode: number | null;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
}

export interface GenerationHeartbeatInfo {
  taskId: string;
  modelId: string;
  state: 'ingesting_prompt' | 'streaming' | 'stalled' | 'completed';
  elapsedMs: number;
  promptIngestionMs: number;
  timeToFirstTokenMs: number | null;
  tokensEmitted: number;
  instantaneousTps: number;
  idleMs: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class ArenaStateStore {

  public readonly liveStreamBuffer = signal<string>('');

  public readonly liveReasoningBuffer = signal<string>('');

  public readonly liveCodeBuffer = signal<string>('');

  public readonly testOutputBuffer = signal<string>('');

  public readonly astScrubbingBuffer = signal<string>('');

  public readonly reviewCritiqueBuffer = signal<string>('');

  public readonly generationHeartbeat = signal<GenerationHeartbeatInfo | null>(null);

  public readonly liveTokenVelocity = signal<number>(0);

  public readonly runTokenVelocity = signal<number>(0);

  public readonly isStreamActive = signal<boolean>(false);

  public readonly isVelocityMatched = computed(() => this.isStreamActive());

  private lastTokenReceivedAt = 0;
  private tokenArrivalTimestamps: number[] = [];
  private velocityDecayTimer: ReturnType<typeof setInterval> | null = null;
  private runTokenCount = 0;
  private runStartTimestamp: number | null = null;
  private currentTaskIdForRun: string | null = null;

  public readonly tempHistory = signal<number[]>([35, 36, 38, 40, 42, 45, 47, 50, 52, 54]);
  public readonly gpuLoadHistory = signal<number[]>([0, 5, 12, 25, 40, 60, 75, 80, 85, 90]);
  public readonly vramHistory = signal<number[]>([15, 20, 25, 30, 35, 40, 45, 50, 52, 55]);
  public readonly gttHistory = signal<number[]>([5, 8, 10, 12, 15, 18, 20, 22, 25, 26]);
  public readonly cpuLoadHistory = signal<number[]>([10, 15, 22, 35, 45, 50, 40, 35, 30, 28]);
  public readonly sysMemHistory = signal<number[]>([30, 31, 32, 33, 34, 35, 36, 37, 38, 38]);

  public readonly sclkHistory = signal<number[]>([200, 400, 800, 1200, 1400, 1600]);

  public readonly sclkMinMhz = computed(() => {
    const history = this.sclkHistory();
    if (history.length === 0) return 0;
    return Math.min(...history);
  });

  public readonly sclkAvgMhz = computed(() => {
    const history = this.sclkHistory();
    if (history.length === 0) return 0;
    return history.reduce((acc, val) => acc + val, 0) / history.length;
  });

  public readonly sclkPeakMhz = computed(() => {
    const history = this.sclkHistory();
    if (history.length === 0) return 0;
    return Math.max(...history);
  });

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

  public readonly selectedTask = signal<TaskItem | null>(null);

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

  public readonly tasks = signal<TaskItem[]>([]);

  public readonly processes = signal<ProcessItem[]>([]);

  public readonly schedulerPaused = signal<boolean>(false);

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

    this.attemptConnection();
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
          createdAt?: string | null;
          updatedAt?: string | null;
          completedAt?: string | null;
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
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          completedAt: t.completedAt,
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

    }

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

    }
  }

  public readonly activeTask = computed(() =>
    this.tasks().find((t) => t.status === 'RUNNING')
  );

  public readonly pendingCount = computed(
    () => this.tasks().filter((t) => t.status === 'PENDING').length
  );

  public readonly completedCount = computed(
    () => this.tasks().filter((t) => t.status === 'COMPLETED').length
  );

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


  public readonly sclkMaxMhz = computed(() => {
      const history = this.sclkHistory();
      if (history.length === 0) return 0;
      return Math.max(...history);
    });

  public readonly smoothedTokenVelocity = signal<number>(0);

  private alpha = 0.1;

  private updateSmoothedTokenVelocity(instant: number): void {
        const smoothed = this.alpha * instant + (1 - this.alpha) * this.smoothedTokenVelocity();
        this.smoothedTokenVelocity.set(smoothed);
      }


  private reconnectAttempts = 0;

  private maxReconnectAttempts = 10;

  private reconnectDelay = 1000;

  private attemptConnection(): void {
      try {
        this.eventSource = new EventSource('/api/events');
        this.eventSource.onmessage = (event) => {
          // Existing message handling logic...
        };

        this.eventSource.onerror = (error) => {
          console.error('EventSource failed:', error);
          this.reconnect();
        };

        // Existing event handlers and timers...
      } catch (error) {
        console.error('Failed to connect EventSource:', error);
        this.reconnect();
      }
    }

  private reconnect(): void {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('Max reconnect attempts reached. Stopping reconnection.');
        return;
      }

      setTimeout(() => {
        console.log(`Attempting to reconnect... Attempt ${this.reconnectAttempts + 1}`);
        this.attemptConnection();
        this.reconnectAttempts++;
        this.reconnectDelay *= 2; // Exponential backoff
      }, this.reconnectDelay);
    }
}