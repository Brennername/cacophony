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
  // Telemetry Signal
  public readonly telemetry = signal<TelemetryMetrics>({
    gpuBusyPercent: 18,
    vramUsedMb: 2150,
    vramTotalMb: 16384,
    gttUsedMb: 4120,
    gttTotalMb: 16384,
    edgeTempCelsius: 58.4,
    thermalZone: 'nominal',
    vddgfxMv: 785,
    pptPowerW: 24.2,
    sclkMhz: 1200,
    activeModel: 'qwen2.5-coder:7b',
  });

  // Task Queue Signals
  public readonly tasks = signal<TaskItem[]>([
    {
      id: 'task-101',
      title: 'Implement AST inspection validator',
      status: 'RUNNING',
      priority: 'P0',
      role: 'implementer',
      currentStage: 'generation',
      tokensPerSec: 42.5,
      logSnippet: 'Streaming AST tokens from Ollama qwen2.5-coder:7b...',
    },
    {
      id: 'task-102',
      title: 'Scrub ESM relative import extensions',
      status: 'PENDING',
      priority: 'P1',
      role: 'implementer',
    },
    {
      id: 'task-103',
      title: 'Verify Gitea OAuth2 session exchange',
      status: 'COMPLETED',
      priority: 'P1',
      role: 'test_engineer',
    },
  ]);

  // Process Monitor Signals
  public readonly processes = signal<ProcessItem[]>([
    {
      id: 'proc-1',
      command: 'npm run test --workspace=@cacophony/tools',
      durationMs: 791,
      exitCode: 0,
      status: 'SUCCESS',
    },
    {
      id: 'proc-2',
      command: 'git worktree add -B task-101 /workspaces/task-101 main',
      durationMs: 230,
      exitCode: 0,
      status: 'SUCCESS',
    },
  ]);

  // Scheduler control signal
  public readonly schedulerPaused = signal<boolean>(false);

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
