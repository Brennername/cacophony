import { Injectable, signal, computed } from '@angular/core';

export interface TelemetryMetrics {
  gpuBusyPercent: number;
  vramUsedMb: number;
  vramTotalMb: number;
  gttUsedMb: number;
  gttTotalMb: number;
  edgeTempCelsius: number;
  thermalZone: 'nominal' | 'warm' | 'elevated' | 'danger';
  vddgfxMv: number;
  pptPowerW: number;
  sclkMhz: number;
  activeModel: string;
}

export interface TaskItem {
  id: string;
  title: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'REMEDIATED';
  priority: 'P0' | 'P1' | 'P2';
  role: string;
  currentStage?: string;
  tokensPerSec?: number;
  logSnippet?: string;
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
  // Telemetry Signal initialized with zero/clean state
  public readonly telemetry = signal<TelemetryMetrics>({
    gpuBusyPercent: 0,
    vramUsedMb: 0,
    vramTotalMb: 16384,
    gttUsedMb: 0,
    gttTotalMb: 16384,
    edgeTempCelsius: 0,
    thermalZone: 'nominal',
    vddgfxMv: 0,
    pptPowerW: 0,
    sclkMhz: 0,
    activeModel: 'None',
  });

  // Task Queue Signals initialized empty from real backend
  public readonly tasks = signal<TaskItem[]>([]);

  // Process Monitor Signals initialized empty
  public readonly processes = signal<ProcessItem[]>([]);

  // Scheduler control signal
  public readonly schedulerPaused = signal<boolean>(false);

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
              gttUsedMb: data.gttUsedMb ?? 0,
              gttTotalMb: data.gttTotalMb ?? 16384,
              edgeTempCelsius: data.edgeTempCelsius ?? 0,
              thermalZone: data.thermalZone ?? 'nominal',
              vddgfxMv: data.vddgfxMv ?? 0,
              pptPowerW: data.pptPowerW ?? 0,
              sclkMhz: data.sclkMhz ?? 0,
              activeModel: data.activeModel ?? 'None',
            });
          }
        } catch {
          // ignore stream parse errors
        }
      };
    } catch {
      // offline / mock environment
    }
  }

  public async fetchInitialState(): Promise<void> {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const rawTasks = await res.json() as Array<{ id: string; title: string; status: string; priority: string; role: string }>;
        const items: TaskItem[] = rawTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: (t.status as TaskItem['status']) || 'PENDING',
          priority: (t.priority as TaskItem['priority']) || 'P1',
          role: t.role || 'implementer',
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
}
