import { EventEmitter } from "node:events";
import type { StageName, StageStatus } from "@cacophony/shared-types";

export interface StreamTokenEvent {
  readonly taskId: string;
  readonly token: string;
  readonly timestamp: number;
}

export interface StageTransitionEvent {
  readonly taskId: string;
  readonly stageName: StageName;
  readonly stageStatus: StageStatus;
  readonly durationMs?: number | undefined;
  readonly timestamp: number;
}

/**
 * StreamTapManager
 * Facilitates real-time observation, audit tapping, and flow control
 * of live token output and pipeline stage transitions.
 */
export class StreamTapManager {
  private readonly emitter = new EventEmitter();
  private readonly suspendedTasks = new Set<string>();
  private activeTaskId: string | null = null;

  private readonly taskBuffers = new Map<string, string>();
  private readonly maxBufferSize = 25000;

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  /**
   * Sets the active task currently generating inference.
   */
  public setActiveTask(taskId: string | null): void {
    this.activeTaskId = taskId;
  }

  /**
   * Gets the active task ID if one is generating.
   */
  public getActiveTask(): string | null {
    return this.activeTaskId;
  }

  /**
   * Emits a generated token to all active stream tap listeners and stores in ring buffer.
   */
  public emitToken(taskId: string, token: string): void {
    const current = this.taskBuffers.get(taskId) || "";
    const updated = (current + token).slice(-this.maxBufferSize);
    this.taskBuffers.set(taskId, updated);

    const event: StreamTokenEvent = {
      taskId,
      token,
      timestamp: Date.now()
    };
    this.emitter.emit("token", event);
    this.emitter.emit(`token:${taskId}`, event);
  }

  /**
   * Gets the buffered tokens for a task or the active task.
   */
  public getBuffer(taskId?: string): string {
    const target = taskId || this.activeTaskId;
    if (!target) return "";
    return this.taskBuffers.get(target) || "";
  }


  /**
   * Clears the buffer for a task.
   */
  public clearBuffer(taskId?: string): void {
    const target = taskId || this.activeTaskId;
    if (!target) return;
    this.taskBuffers.delete(target);
  }

  /**
   * Subscribes a listener to live token stream.
   * If taskId is specified, listens only for that task.
   */
  public tap(listener: (event: StreamTokenEvent) => void, taskId?: string): () => void {
    const eventName = taskId ? `token:${taskId}` : "token";
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  /**
   * Emits a pipeline stage transition event to all listeners.
   */
  public emitStageTransition(event: StageTransitionEvent): void {
    this.emitter.emit("stage_transition", event);
    this.emitter.emit(`stage_transition:${event.taskId}`, event);
  }

  /**
   * Subscribes a listener to live stage transition events.
   * If taskId is specified, listens only for that task.
   */
  public tapStageTransitions(listener: (event: StageTransitionEvent) => void, taskId?: string): () => void {
    const eventName = taskId ? `stage_transition:${taskId}` : "stage_transition";
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  /**
   * Suspends token production for a task.
   */
  public suspend(taskId?: string): boolean {
    const target = taskId || this.activeTaskId;
    if (!target) return false;
    this.suspendedTasks.add(target);
    this.emitter.emit("suspend", target);
    return true;
  }

  /**
   * Resumes token production for a task.
   */
  public resume(taskId?: string): boolean {
    const target = taskId || this.activeTaskId;
    if (!target) return false;
    const removed = this.suspendedTasks.delete(target);
    if (removed) {
      this.emitter.emit("resume", target);
    }
    return removed;
  }

  /**
   * Checks whether token production is currently suspended for a task.
   */
  public isSuspended(taskId?: string): boolean {
    const target = taskId || this.activeTaskId;
    if (!target) return false;
    return this.suspendedTasks.has(target);
  }

  /**
   * Helper promise that pauses execution if the task is suspended.
   */
  public async waitIfSuspended(taskId?: string): Promise<void> {
    const target = taskId || this.activeTaskId;
    if (!target || !this.suspendedTasks.has(target)) return;

    return new Promise((resolve) => {
      const onResume = (resumedTask: string) => {
        if (resumedTask === target) {
          this.emitter.off("resume", onResume);
          resolve();
        }
      };
      this.emitter.on("resume", onResume);
    });
  }
}
