import { EventEmitter } from "node:events";
import type { StageName, StageStatus } from "@cacophony/shared-types";
import { ReasoningStreamDemuxer } from "./ReasoningStreamDemuxer.js";

export interface StreamTokenEvent {
  readonly taskId: string;
  readonly token: string;
  readonly timestamp: number;
}

export interface DemuxedTokenEvent {
  readonly taskId: string;
  readonly chunk: string;
  readonly type: "reasoning" | "code";
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
  private readonly taskDemuxers = new Map<string, ReasoningStreamDemuxer>();
  public readonly maxBufferSize = 100000;
  private readonly bufferTimestamps = new Map<string, number>();

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
   * Enforces FIFO rolling truncation: slices oldest characters when buffer exceeds max limit
   * to prevent node process heap bloat.
   */
  public enforceBufferLimit(taskId: string, chunk: string): string {
    const current = this.taskBuffers.get(taskId) || "";
    const updated = (current + chunk).slice(-this.maxBufferSize);
    this.taskBuffers.set(taskId, updated);
    this.bufferTimestamps.set(taskId, Date.now());
    return updated;
  }

  /**
   * Evicts buffers for tasks whose last activity was more than maxAgeMs ago (default 30 mins)
   * during periodic garbage collection sweeps.
   */
  public sweepStaleBuffers(maxAgeMs: number = 30 * 60 * 1000): number {
    const now = Date.now();
    let evictedCount = 0;
    for (const [taskId, lastActive] of this.bufferTimestamps.entries()) {
      if (now - lastActive >= maxAgeMs) {
        this.clearBuffer(taskId);
        this.bufferTimestamps.delete(taskId);
        evictedCount++;
      }
    }
    return evictedCount;
  }

  /**
   * Emits a generated token to all active stream tap listeners, updates the ring buffer,
   * and runs through ReasoningStreamDemuxer to emit dual reasoning_chunk and code_chunk events.
   */
  public emitToken(taskId: string, token: string): void {
    this.enforceBufferLimit(taskId, token);

    const now = Date.now();
    const event: StreamTokenEvent = {
      taskId,
      token,
      timestamp: now
    };
    this.emitter.emit("token", event);
    this.emitter.emit(`token:${taskId}`, event);

    // Run token through the task's demuxer
    let demuxer = this.taskDemuxers.get(taskId);
    if (!demuxer) {
      demuxer = new ReasoningStreamDemuxer();
      this.taskDemuxers.set(taskId, demuxer);
    }

    const chunks = demuxer.feed(token);
    for (const chunk of chunks) {
      const eventName = chunk.type === "reasoning" ? "reasoning_chunk" : "code_chunk";
      const demuxedEvent: DemuxedTokenEvent = {
        taskId,
        chunk: chunk.content,
        type: chunk.type,
        timestamp: now
      };
      this.emitter.emit(eventName, demuxedEvent);
      this.emitter.emit(`${eventName}:${taskId}`, demuxedEvent);
    }
  }

  /**
   * Returns the task's accumulated reasoning transcript from demuxer.
   */
  public getReasoningTranscript(taskId?: string): string {
    const target = taskId || this.activeTaskId;
    if (!target) return "";
    return this.taskDemuxers.get(target)?.getAccumulatedReasoning() || "";
  }

  /**
   * Returns the task's accumulated executable code from demuxer.
   */
  public getDemuxedCode(taskId?: string): string {
    const target = taskId || this.activeTaskId;
    if (!target) return "";
    return this.taskDemuxers.get(target)?.getAccumulatedCode() || "";
  }

  /**
   * Returns true if the demuxer for the given task is currently inside a <think> block.
   */
  public isInsideThinkBlock(taskId?: string): boolean {
    const target = taskId || this.activeTaskId;
    if (!target) return false;
    return this.taskDemuxers.get(target)?.isInsideThinkBlock() || false;
  }

  /**
   * Gets the buffered tokens for a task or the active task.
   */
  public getBuffer(taskId?: string): string {
    const target = taskId || this.activeTaskId;
    if (!target) return "";
    return this.taskBuffers.get(target) || "";
  }

  /** Returns the timestamp of the most recent streamed token for a task. */
  public getLastTokenAt(taskId: string): number | undefined {
    return this.bufferTimestamps.get(taskId);
  }

  /**
   * Clears the buffer and demuxer state for a task.
   */
  public clearBuffer(taskId?: string): void {
    const target = taskId || this.activeTaskId;
    if (!target) return;
    this.taskBuffers.delete(target);
    this.taskDemuxers.delete(target);
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
   * Subscribes a listener to live reasoning chunk events.
   */
  public tapReasoning(listener: (event: DemuxedTokenEvent) => void, taskId?: string): () => void {
    const eventName = taskId ? `reasoning_chunk:${taskId}` : "reasoning_chunk";
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  /**
   * Subscribes a listener to live code chunk events.
   */
  public tapCode(listener: (event: DemuxedTokenEvent) => void, taskId?: string): () => void {
    const eventName = taskId ? `code_chunk:${taskId}` : "code_chunk";
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
