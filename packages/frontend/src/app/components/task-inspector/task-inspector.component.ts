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

export interface TaskStageItem {
  stageName: string;
  stageStatus: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILURE';
  durationMs?: number;
}

export class ArenaStateStore {
  readonly liveStreamBuffer = signal<string>('');
  readonly liveReasoningBuffer = signal<string>('');
  readonly liveCodeBuffer = signal<string>('');
  readonly liveTokenVelocity = computed(() => this.calculateLiveTokenVelocity());
  readonly runTokenVelocity = computed(() => this.calculateRunTokenVelocity());
  readonly isStreamActive = signal<boolean>(false);
  readonly isVelocityMatched = computed(() => this.checkVelocityMatch());

  private tokenArrivalTimestamps: number[] = [];
  private velocityDecayTimer: ReturnType<typeof setInterval> | null = null;
  private runTokenCount = 0;
  private runStartTimestamp: number | null = null;
  private currentTaskIdForRun: string | null = null;

  readonly tempHistory = signal<{ update: (fn: (v: number[]) => number[]) => void }>({ update: () => {} });
  readonly gpuLoadHistory = signal<{ update: (fn: (v: number[]) => number[]) => void }>({ update: () => {} });
  readonly vramHistory = signal<{ update: (fn: (v: number[]) => number[]) => void }>({ update: () => {} });
  readonly gttHistory = signal<{ update: (fn: (v: number[]) => number[]) => void }>({ update: () => {} });
  readonly cpuLoadHistory = signal<{ update: (fn: (v: number[]) => number[]) => void }>({ update: () => {} });
  readonly sysMemHistory = signal<{ update: (fn: (v: number[]) => number[]) => void }>({ update: () => {} });
  readonly modelHighWaterMarks = signal<{ update: (fn: (v: number[]) => number[]) => void }>({ update: () => {} });
  readonly modelVelocitySamples = signal<{ update: (fn: (v: number[]) => number[]) => void }>({ update: () => {} });
  readonly activeModelHighWaterMark = signal<number>(0);
  readonly selectedTask = signal<TaskItem | null>(null);
  readonly telemetry = signal<any>({});
  readonly tasks = signal<TaskItem[]>([]);
  readonly processes = signal<any[]>([]);
  readonly schedulerPaused = signal<boolean>(false);
  readonly currentUserRole = signal<string>('');
  readonly canMutateTasks = signal<boolean>(false);
  readonly isAdmin = signal<boolean>(false);

  eventSource: EventSource | null = null;

  constructor() {
    this.connectLiveStreams();
    void this.fetchInitialState();
  }

  appendHistory(sig: { update: (fn: (v: number[]) => number[]) => void }, val: number): void {
    sig.update((v) => [...v, val]);
  }

  recordModelVelocity(model: string, velocity: number): void {
    // Implementation to record model velocity
  }

  connectLiveStreams(): void {
    this.eventSource = new EventSource('/api/live-streams');
    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'stream') {
        this.liveStreamBuffer.set(data.buffer);
      } else if (data.type === 'reasoning') {
        this.liveReasoningBuffer.set(data.buffer);
      }
    };
  }

  async fetchInitialState(): Promise<void> {
    try {
      const res = await fetch('/api/initial-state');
      if (res.ok) {
        const data = await res.json();
        this.tasks.set(data.tasks);
        this.selectedTask.set(data.selectedTask);
      }
    } catch (error) {
      console.error('Failed to fetch initial state:', error);
    }
  }

  readonly activeTask = computed(() => this.selectedTask());
  readonly pendingCount = computed(() => this.tasks().filter(t => t.status === 'PENDING').length);
  readonly completedCount = computed(() => this.tasks().filter(t => t.status === 'COMPLETED').length);

  toggleScheduler(): void {
    this.schedulerPaused.set(!this.schedulerPaused());
  }

  moveTaskPriority(taskId: string, direction: 'up' | 'down'): void {
    // Implementation to move task priority
  }

  addTask(title: string, priority: 'P0' | 'P1' | 'P2'): void {
    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      title,
      status: 'PENDING',
      priority,
      role: this.currentUserRole(),
      createdAt: new Date().toISOString()
    };
    this.tasks.update(tasks => [...tasks, newTask]);
  }

  async selectTask(taskOrId: TaskItem | string): Promise<void> {
    if (typeof taskOrId === 'string') {
      const task = this.tasks().find(t => t.id === taskOrId);
      if (task) {
        this.selectedTask.set(task);
      }
    } else {
      this.selectedTask.set(taskOrId);
    }
  }

  clearSelectedTask(): void {
    this.selectedTask.set(null);
  }

  private calculateLiveTokenVelocity(): number {
    const now = Date.now();
    const lastTimestamp = this.tokenArrivalTimestamps.length > 0 ? this.tokenArrivalTimestamps[this.tokenArrivalTimestamps.length - 1] : now;
    return (this.tokenArrivalTimestamps.length / ((now - lastTimestamp) / 1000)) * 1000;
  }

  private calculateRunTokenVelocity(): number {
    if (!this.runStartTimestamp || !this.currentTaskIdForRun) return 0;
    const now = Date.now();
    const durationMs = now - this.runStartTimestamp;
    return (this.runTokenCount / durationMs) * 1000;
  }

  private checkVelocityMatch(): boolean {
    // Implementation to check if velocity is matched
    return false;
  }
}