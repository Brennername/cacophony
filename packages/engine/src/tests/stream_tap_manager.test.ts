// @ts-ignore
export const WebSocket: any = Object.assign(function(..._args: any[]) { return this; }, { [Symbol.iterator]: function*() {} });
// @ts-ignore
export namespace WebSocket { export type Node = any; export type SourceFile = any; export type Type = any; export type Symbol = any; }

import { EventEmitter } from "node:events";
import type { StageName, StageStatus } from "@cacophony/shared-types";
import {
  ReasoningStreamDemuxer,
  type DemuxChunk,
} from "../inference/ReasoningStreamDemuxer.js";

export interface StreamTokenEvent {
  readonly taskId: string;
  readonly token: string;
  readonly timestamp: number;
}

export interface DemuxedTokenEvent {
  readonly taskId: string;
  readonly chunk: string;
  readonly content?: string;
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

export interface GenerationHeartbeatEvent {
  readonly taskId: string;
  readonly modelId: string;
  readonly state: "ingesting_prompt" | "streaming" | "stalled" | "completed";
  readonly elapsedMs: number;
  readonly promptIngestionMs: number;
  readonly timeToFirstTokenMs: number | null;
  readonly tokensEmitted: number;
  readonly instantaneousTps: number;
  readonly idleMs: number;
  readonly timestamp: number;
}

export interface SubStageLogEvent {
  readonly taskId: string;
  readonly channel: "test_output" | "ast_scrubbing" | "review_critique";
  readonly content: string;
  readonly timestamp: number;
}

export interface VramPressureEvent {
  readonly taskId: string;
  readonly vramUsage: number;
  readonly vramLimit: number;
  readonly timestamp: number;
}

export class StreamTapManager {
  private readonly emitter = new EventEmitter();
  private readonly suspendedTasks = new Set<string>();
  private activeTaskId: string | null = null;

  private readonly taskBuffers = new Map<string, string>();
  private readonly taskDemuxers = new Map<string, ReasoningStreamDemuxer>();
  public readonly maxBufferSize = 100000;
  private readonly bufferTimestamps = new Map<string, number>();
  private readonly activityTimestamps = new Map<string, number>();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  public setActiveTask(taskId: string | null): void {
    this.activeTaskId = taskId;
  }

  public getActiveTask(): string | null {
    return this.activeTaskId;
  }

  public enforceBufferLimit(taskId: string, chunk: string): string {
    const current = this.taskBuffers.get(taskId) || "";
    const updated = (current + chunk).slice(-this.maxBufferSize);
    this.taskBuffers.set(taskId, updated);
    this.bufferTimestamps.set(taskId, Date.now());
    return updated;
  }

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

  public emitToken(taskId: string, token: string): void {
    this.enforceBufferLimit(taskId, token);

    const now = Date.now();
    this.activityTimestamps.set(
      taskId,
      Math.max(now, (this.activityTimestamps.get(taskId) ?? 0) + 1),
    );
    const event: StreamTokenEvent = {
      taskId,
      token,
      timestamp: now,
    };
    this.emitter.emit("token", event);
    this.emitter.emit(`token:${taskId}`, event);

    let demuxer = this.taskDemuxers.get(taskId);
    if (!demuxer) {
      demuxer = new ReasoningStreamDemuxer();
      this.taskDemuxers.set(taskId, demuxer);
    }

    const chunks = demuxer.feed(token);
    for (const chunk of chunks) {
      const eventName =
        chunk.type === "reasoning" ? "reasoning_chunk" : "code_chunk";
      const demuxedEvent: DemuxedTokenEvent = {
        taskId,
        chunk: chunk.content,
        content: chunk.content,
        type: chunk.type,
        timestamp: now,
      };
      this.emitter.emit(eventName, demuxedEvent);
      this.emitter.emit(`${eventName}:${taskId}`, demuxedEvent);
    }
  }

  public getReasoningTranscript(taskId?: string): string {
    const target = taskId || this.activeTaskId;
    if (!target) return "";
    return this.taskDemuxers.get(target)?.getAccumulatedReasoning() || "";
  }

  public getDemuxedCode(taskId?: string): string {
    const target = taskId || this.activeTaskId;
    if (!target) return "";
    return this.taskDemuxers.get(target)?.getAccumulatedCode() || "";
  }

  public isInsideThinkBlock(taskId?: string): boolean {
    const target = taskId || this.activeTaskId;
    if (!target) return false;
    return this.taskDemuxers.get(target)?.isInsideThinkBlock() || false;
  }

  public getBuffer(taskId?: string): string {
    const target = taskId || this.activeTaskId;
    if (!target) return "";
    return this.taskBuffers.get(target) || "";
  }

  public getLastTokenAt(taskId: string): number | undefined {
    return this.bufferTimestamps.get(taskId);
  }

  public getLastActivityAt(taskId: string): number | undefined {
    return this.activityTimestamps.get(taskId);
  }

  public clearBuffer(taskId?: string): void {
    const target = taskId || this.activeTaskId;
    if (!target) return;
    this.taskBuffers.delete(target);
    this.taskDemuxers.delete(target);
    this.bufferTimestamps.delete(target);
    this.activityTimestamps.delete(target);
  }

  public flush(taskId?: string): DemuxChunk[] {
    const target = taskId || this.activeTaskId;
    if (!target) return [];
    const demuxer = this.taskDemuxers.get(target);
    if (!demuxer) return [];

    const now = Date.now();
    const chunks = demuxer.flush();
    for (const chunk of chunks) {
      const eventName =
        chunk.type === "reasoning" ? "reasoning_chunk" : "code_chunk";
      const demuxedEvent: DemuxedTokenEvent = {
        taskId: target,
        chunk: chunk.content,
        content: chunk.content,
        type: chunk.type,
        timestamp: now,
      };
      this.emitter.emit(eventName, demuxedEvent);
      this.emitter.emit(`${eventName}:${target}`, demuxedEvent);
    }
    return chunks;
  }

  public resetDemuxer(taskId?: string): void {
    const target = taskId || this.activeTaskId;
    if (!target) return;
    const demuxer = this.taskDemuxers.get(target);
    if (demuxer) {
      demuxer.reset();
    }
  }

  public tap(
    listener: (event: StreamTokenEvent) => void,
    taskId?: string,
  ): () => void {
    const eventName = taskId ? `token:${taskId}` : "token";
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  public tapReasoning(
    listener: (event: DemuxedTokenEvent) => void,
    taskId?: string,
  ): () => void {
    const eventName = taskId ? `reasoning_chunk:${taskId}` : "reasoning_chunk";
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  public tapCode(
    listener: (event: DemuxedTokenEvent) => void,
    taskId?: string,
  ): () => void {
    const eventName = taskId ? `code_chunk:${taskId}` : "code_chunk";
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  public emitStageTransition(event: StageTransitionEvent): void {
    this.activityTimestamps.set(
      event.taskId,
      Math.max(
        event.timestamp,
        (this.activityTimestamps.get(event.taskId) ?? 0) + 1,
      ),
    );
    this.emitter.emit("stage_transition", event);
    this.emitter.emit(`stage_transition:${event.taskId}`, event);
  }

  public tapStageTransitions(
    listener: (event: StageTransitionEvent) => void,
    taskId?: string,
  ): () => void {
    const eventName = taskId
      ? `stage_transition:${taskId}`
      : "stage_transition";
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  public emitGenerationHeartbeat(event: GenerationHeartbeatEvent): void {
    this.emitter.emit("generation_heartbeat", event);
    this.emitter.emit(`generation_heartbeat:${event.taskId}`, event);
  }

  public tapGenerationHeartbeat(
    listener: (event: GenerationHeartbeatEvent) => void,
    taskId?: string,
  ): () => void {
    const eventName = taskId
      ? `generation_heartbeat:${taskId}`
      : "generation_heartbeat";
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  public emitSubStageLog(event: SubStageLogEvent): void {
    this.emitter.emit("substage_log", event);
    this.emitter.emit(`substage_log:${event.taskId}`, event);
  }

  public tapSubStageLog(
    listener: (event: SubStageLogEvent) => void,
    taskId?: string,
  ): () => void {
    const eventName = taskId ? `substage_log:${taskId}` : "substage_log";
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  public broadcastEpochAdvanced(event: {
    readonly epochId: number;
    readonly name: string;
    readonly reason: string;
    readonly timestamp?: number;
  }): void {
    const payload = {
      ...event,
      timestamp: event.timestamp ?? Date.now(),
    };
    this.emitter.emit("arena_epoch_advanced", payload);
  }

  public tapEpochAdvanced(
    listener: (event: {
      epochId: number;
      name: string;
      reason: string;
      timestamp: number;
    }) => void,
  ): () => void {
    this.emitter.on("arena_epoch_advanced", listener);
    return () => {
      this.emitter.off("arena_epoch_advanced", listener);
    };
  }

  public suspend(taskId?: string): boolean {
    const target = taskId || this.activeTaskId;
    if (!target) return false;
    this.suspendedTasks.add(target);
    this.emitter.emit("suspend", target);
    return true;
  }

  public resume(taskId?: string): boolean {
    const target = taskId || this.activeTaskId;
    if (!target) return false;
    const removed = this.suspendedTasks.delete(target);
    if (removed) {
      this.emitter.emit("resume", target);
    }
    return removed;
  }

  public isSuspended(taskId?: string): boolean {
    const target = taskId || this.activeTaskId;
    if (!target) return false;
    return this.suspendedTasks.has(target);
  }

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

  public getTaskBuffer(taskId: string): string {
    return this.taskBuffers.get(taskId) || "";
  }

  public emitVramPressure(event: VramPressureEvent): void {
    this.emitter.emit("vram_pressure", event);
    this.emitter.emit(`vram_pressure:${event.taskId}`, event);
  }

  public tapVramPressure(
    listener: (event: VramPressureEvent) => void,
    taskId?: string,
  ): () => void {
    const eventName = taskId ? `vram_pressure:${taskId}` : "vram_pressure";
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }
}
