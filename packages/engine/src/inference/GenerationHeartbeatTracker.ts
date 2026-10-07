import type { StreamTapManager } from "./StreamTapManager.js";

export type GenerationState = "ingesting_prompt" | "streaming" | "stalled" | "completed";

export interface GenerationHeartbeat {
  readonly taskId: string;
  readonly modelId: string;
  readonly state: GenerationState;
  readonly elapsedMs: number;
  readonly promptIngestionMs: number;
  readonly timeToFirstTokenMs: number | null;
  readonly tokensEmitted: number;
  readonly instantaneousTps: number;
  readonly idleMs: number;
  readonly timestamp: number;
}

/**
 * GenerationHeartbeatTracker
 *
 * Monitors real-time token generation during the generation stage to disambiguate:
 * 1. Prompt Ingestion Latency (pre-first token compute on APU/GPU)
 * 2. Active Token Streaming (with measured instantaneous tok/s)
 * 3. Stalled / Frozen Stream Condition (prolonged silence past threshold)
 */
export class GenerationHeartbeatTracker {
  private readonly taskId: string;
  private readonly modelId: string;
  private readonly streamTapManager?: StreamTapManager | undefined;
  private readonly stallThresholdMs: number;

  private startTime = 0;
  private firstTokenTime: number | null = null;
  private lastTokenTime = 0;
  private tokensCount = 0;
  private isFinished = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(options: {
    readonly taskId: string;
    readonly modelId: string;
    readonly streamTapManager?: StreamTapManager | undefined;
    readonly stallThresholdMs?: number | undefined;
    readonly heartbeatIntervalMs?: number | undefined;
    readonly onHeartbeat?: ((hb: GenerationHeartbeat) => void) | undefined;
  }) {
    this.taskId = options.taskId;
    this.modelId = options.modelId;
    this.streamTapManager = options.streamTapManager;
    this.stallThresholdMs = options.stallThresholdMs ?? 7000;
  }

  /**
   * Starts tracking when prompt is sent to inference provider.
   */
  public start(): void {
    this.startTime = Date.now();
    this.lastTokenTime = this.startTime;
    this.tokensCount = 0;
    this.firstTokenTime = null;
    this.isFinished = false;

    if (this.streamTapManager && !this.timer) {
      this.timer = setInterval(() => {
        if (!this.isFinished) {
          this.streamTapManager?.emitGenerationHeartbeat(this.sample());
        }
      }, 1000);
    }
  }

  /**
   * Records receipt of an emitted token chunk.
   */
  public recordToken(tokenLength = 1): void {
    const now = Date.now();
    if (this.firstTokenTime === null) {
      this.firstTokenTime = now;
    }
    this.lastTokenTime = now;
    this.tokensCount += tokenLength;
  }

  /**
   * Samples current generation health status.
   */
  public sample(): GenerationHeartbeat {
    const now = Date.now();
    const elapsedMs = Math.max(0, now - this.startTime);
    const idleMs = Math.max(0, now - this.lastTokenTime);

    let state: GenerationState;
    if (this.isFinished) {
      state = "completed";
    } else if (this.firstTokenTime === null) {
      state = idleMs > this.stallThresholdMs ? "stalled" : "ingesting_prompt";
    } else if (idleMs > this.stallThresholdMs) {
      state = "stalled";
    } else {
      state = "streaming";
    }

    const promptIngestionMs = this.firstTokenTime !== null
      ? this.firstTokenTime - this.startTime
      : elapsedMs;

    const streamingDurationMs = this.firstTokenTime !== null
      ? Math.max(1, now - this.firstTokenTime)
      : 1;

    const instantaneousTps = this.firstTokenTime !== null && this.tokensCount > 0
      ? Number(((this.tokensCount / streamingDurationMs) * 1000).toFixed(2))
      : 0;

    return {
      taskId: this.taskId,
      modelId: this.modelId,
      state,
      elapsedMs,
      promptIngestionMs,
      timeToFirstTokenMs: this.firstTokenTime !== null ? this.firstTokenTime - this.startTime : null,
      tokensEmitted: this.tokensCount,
      instantaneousTps,
      idleMs,
      timestamp: now
    };
  }

  /**
   * Concludes the tracking session.
   */
  public finish(): GenerationHeartbeat {
    this.isFinished = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const finalSample = this.sample();
    this.streamTapManager?.emitGenerationHeartbeat(finalSample);
    return finalSample;
  }
}
