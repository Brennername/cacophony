import { Injectable, signal, computed } from '@angular/core';

export interface TelemetryMetrics {
  gpuBusyPercent: number;
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
  // Live Terminal Stream Buffer
  public readonly liveStreamBuffer = signal<string>('');

  // Live Token Velocity (tokens per second)
  public readonly liveTokenVelocity = signal<number>(0);
  private tokenArrivalTimestamps: number[] = [];
  private velocityDecayTimer: ReturnType<typeof setInterval> | null = null;

  // Selected Task for Drill-Down Modal
  public readonly selectedTask = signal<TaskItem | null>(null);

  // Telemetry Signal initialized with zero/clean state
  public readonly telemetry = signal<TelemetryMetrics>({
    gpuBusyPercent: 0,
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

  private connectLiveStreams(): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    try {
      this.eventSource = new EventSource('/api/events');
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'telemetry') {
            this.telemetry.set({
              gpuBusyPercent: data.gpuBusy ?? 0,
              vramUsedMb: data.vramUsedMb ?? 0,
              vramTotalMb: data.vramTotalMb ?? 16384,
              vramAvailMb: data.vramAvailMb ?? Math.max(0, (data.vramTotalMb ?? 16384) - (data.vramUsedMb ?? 0)),
              vramPercent: data.vramPercent ?? (data.vramTotalMb ? Number(((data.vramUsedMb / data.vramTotalMb) * 100).toFixed(1)) : 0),
              gttUsedMb: data.gttUsedMb ?? 0,
              gttTotalMb: data.gttTotalMb ?? 16384,
              edgeTempCelsius: data.edgeTempCelsius ?? 0,
              thermalZone: data.thermalZone ?? 'nominal',
              vddgfxMv: data.vddgfxMv ?? 0,
              socMv: data.socMv ?? 0,
              vddnbMv: data.vddnbMv ?? data.socMv ?? 0,
              pptPowerW: data.pptPowerW ?? 0,
              sclkMhz: data.sclkMhz ?? 0,
              mclkMhz: data.mclkMhz ?? 0,
              activeModel: data.activeModel ?? 'None',
            });
          }
          if (data.type === 'stream_init') {
            if (data.buffer) {
              this.liveStreamBuffer.set(data.buffer);
            }
          }
          if (data.type === 'token') {
            const token = data.token ?? '';
            this.liveStreamBuffer.update((prev) => {
              const updated = prev + token;
              return updated.length > 25000 ? updated.slice(-25000) : updated;
            });

            // Calculate rolling token velocity over a 2-second sliding window
            const now = Date.now();
            this.tokenArrivalTimestamps.push(now);
            const cutoff = now - 2000;
            this.tokenArrivalTimestamps = this.tokenArrivalTimestamps.filter((t) => t >= cutoff);
            const count = this.tokenArrivalTimestamps.length;
            const velocity = count > 1 ? Number((count / 2.0).toFixed(1)) : (count === 1 ? 1 : 0);
            this.liveTokenVelocity.set(velocity);
          }
        } catch {
          // ignore stream parse errors
        }
      };

      // Velocity decay timer: resets velocity to 0 when no tokens have arrived in 2 seconds
      this.velocityDecayTimer = setInterval(() => {
        const now = Date.now();
        const cutoff = now - 2000;
        this.tokenArrivalTimestamps = this.tokenArrivalTimestamps.filter((t) => t >= cutoff);
        if (this.tokenArrivalTimestamps.length === 0 && this.liveTokenVelocity() > 0) {
          this.liveTokenVelocity.set(0);
        }
      }, 500);

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
          this.tasks.set(items);
        }
      }
    } catch {
      // offline
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
