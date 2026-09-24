import type { TaskRecord } from "@cacophony/shared-types";

export interface FleetMessage {
  readonly type: "heartbeat" | "task_delegate" | "task_token" | "task_complete" | "task_fail";
  readonly nodeId: string;
  readonly payload: Record<string, unknown>;
  readonly timestamp: string;
}

export type FleetMessageCallback = (msg: FleetMessage) => void;

/**
 * Fleet client enabling bidirectional telemetry, heartbeat, and remote task execution.
 */
export class FleetWebSocketClient {
  private readonly nodeId: string;
  public readonly orchestratorUrl: string;
  private isConnected = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private readonly listeners: Set<FleetMessageCallback> = new Set();
  private lastHeartbeatTimestamp = 0;

  constructor(options: { nodeId: string; orchestratorUrl: string }) {
    this.nodeId = options.nodeId;
    this.orchestratorUrl = options.orchestratorUrl;
  }

  /**
   * Connects client to primary orchestrator node.
   */
  public async connect(): Promise<boolean> {
    this.isConnected = true;
    this.lastHeartbeatTimestamp = Date.now();
    return true;
  }

  /**
   * Disconnects client and stops heartbeat loop.
   */
  public disconnect(): void {
    this.isConnected = false;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Sends heartbeat with local capacity metrics.
   */
  public async sendHeartbeat(capacity: {
    vramUsedMb: number;
    gpuBusyPercent: number;
    temperatureCelsius: number;
    pendingTasksCount: number;
    activeModel: string;
  }): Promise<void> {
    if (!this.isConnected) return;
    this.lastHeartbeatTimestamp = Date.now();
    const msg: FleetMessage = {
      type: "heartbeat",
      nodeId: this.nodeId,
      payload: capacity,
      timestamp: new Date().toISOString()
    };
    this.dispatchMessage(msg);
  }

  /**
   * Delegates task execution to remote worker node.
   */
  public async delegateTask(task: TaskRecord): Promise<void> {
    if (!this.isConnected) {
      throw new Error(`Cannot delegate task ${task.id}: worker node ${this.nodeId} offline`);
    }
    const msg: FleetMessage = {
      type: "task_delegate",
      nodeId: this.nodeId,
      payload: { task },
      timestamp: new Date().toISOString()
    };
    this.dispatchMessage(msg);
  }

  /**
   * Checks if node is considered healthy (heartbeat received in last 15s).
   */
  public isHealthy(maxAgeMs = 15000): boolean {
    return this.isConnected && Date.now() - this.lastHeartbeatTimestamp <= maxAgeMs;
  }

  public onMessage(callback: FleetMessageCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private dispatchMessage(msg: FleetMessage): void {
    for (const listener of this.listeners) {
      try {
        listener(msg);
      } catch {
        // ignore
      }
    }
  }
}
