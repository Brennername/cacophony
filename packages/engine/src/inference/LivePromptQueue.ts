import { EventEmitter } from "node:events";

export interface QueuedPrompt {
  readonly id: string;
  readonly prompt: string;
  readonly submittedAt: number;
  readonly focusFiles?: readonly string[] | undefined;
}

export interface PromptQueueState {
  readonly isStreaming: boolean;
  readonly activePrompt: QueuedPrompt | null;
  readonly pendingPrompts: readonly QueuedPrompt[];
}

/**
 * LivePromptQueue manages user prompt queuing during active model stream generation,
 * support for mid-stream steering guidance annotations, and instant cancellation via AbortController.
 */
export class LivePromptQueue extends EventEmitter {
  private activePrompt: QueuedPrompt | null = null;
  private readonly queue: QueuedPrompt[] = [];
  private abortController: AbortController | null = null;
  private isStreaming = false;
  private guidanceAnnotations: string[] = [];

  constructor() {
    super();
  }

  public getPromptQueueState(): PromptQueueState {
    return {
      isStreaming: this.isStreaming,
      activePrompt: this.activePrompt,
      pendingPrompts: [...this.queue]
    };
  }

  public enqueuePrompt(prompt: string, focusFiles?: readonly string[]): QueuedPrompt {
    const item: QueuedPrompt = {
      id: `prompt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      prompt,
      submittedAt: Date.now(),
      focusFiles
    };

    this.queue.push(item);
    this.emit("enqueued", item);
    this.processNext();
    return item;
  }

  /**
   * Inject guidance annotations that append to the current generation context while streaming.
   */
  public injectSteeringGuidance(annotation: string): void {
    if (!this.isStreaming) {
      throw new Error("Cannot inject mid-stream steering guidance when model is not streaming");
    }
    this.guidanceAnnotations.push(annotation);
    this.emit("steered", { annotation, timestamp: Date.now() });
  }

  public getAndClearSteeringGuidance(): string[] {
    const list = [...this.guidanceAnnotations];
    this.guidanceAnnotations = [];
    return list;
  }

  /**
   * Mid-stream execution interruption: triggers AbortController and resets stream state.
   */
  public interrupt(): boolean {
    if (!this.isStreaming || !this.abortController) {
      return false;
    }

    this.abortController.abort("Execution interrupted by user");
    this.emit("interrupted", { promptId: this.activePrompt?.id });
    this.finishActivePrompt(true);
    return true;
  }

  public startStreaming(abortController: AbortController): void {
    this.isStreaming = true;
    this.abortController = abortController;
    this.emit("streamStarted", { promptId: this.activePrompt?.id });
  }

  public finishActivePrompt(interrupted = false): void {
    const finished = this.activePrompt;
    this.activePrompt = null;
    this.isStreaming = false;
    this.abortController = null;
    this.guidanceAnnotations = [];

    if (finished) {
      this.emit("completed", { prompt: finished, interrupted });
    }

    this.processNext();
  }

  private processNext(): void {
    if (this.isStreaming || this.activePrompt) {
      return;
    }

    const next = this.queue.shift();
    if (next) {
      this.activePrompt = next;
      this.emit("ready", next);
    }
  }
}
