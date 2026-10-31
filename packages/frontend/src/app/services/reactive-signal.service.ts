import { Injectable, signal, Signal, WritableSignal, computed } from '@angular/core';

export interface TelemetryStreamEvent {
  readonly type: string;
  readonly value?: number;
  readonly payload?: { readonly value?: number; readonly [key: string]: unknown };
  readonly timestamp?: number;
}

/**
 * ReactiveSignalService
 *
 * Provides reactive Angular Signal bridging for live telemetry, success rates,
 * and resilient event stream subscriptions with automatic reconnection backoff.
 */
@Injectable({
  providedIn: 'root'
})
export class ReactiveSignalService {
  private readonly signalValue: WritableSignal<number | null> = signal<number | null>(null);
  private readonly connectedSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly reconnectAttemptSignal: WritableSignal<number> = signal<number>(0);

  public readonly value: Signal<number | null> = this.signalValue.asReadonly();
  public readonly isConnected: Signal<boolean> = this.connectedSignal.asReadonly();
  public readonly reconnectAttempts: Signal<number> = this.reconnectAttemptSignal.asReadonly();

  /**
   * Derived success percentage clamped between 0 and 100.
   * Handles normalized [0, 1] inputs as well as direct [0, 100] percentage representations.
   */
  public readonly successPercentage: Signal<number> = computed(() => {
    const raw = this.signalValue();
    if (raw === null || Number.isNaN(raw)) {
      return 0;
    }
    const scaled = raw <= 1 ? raw * 100 : raw;
    return Math.max(0, Math.min(100, Math.round(scaled)));
  });

  private eventSource: EventSource | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly baseBackoffMs: number = 1000;
  private readonly maxBackoffMs: number = 30000;

  /**
   * Reads the current telemetry signal value synchronously.
   * Maintained for backwards compatibility with legacy polling components.
   */
  public getSignalValue(): number | null {
    return this.signalValue();
  }

  /**
   * Updates the underlying telemetry signal value.
   */
  public setSignalValue(value: number | null): void {
    this.signalValue.set(value);
  }

  /**
   * Dispatches an incoming event payload directly to the signal stream.
   */
  public handleStreamEvent(event: TelemetryStreamEvent): void {
    if (typeof event.value === 'number') {
      this.signalValue.set(event.value);
    } else if (event.payload && typeof event.payload.value === 'number') {
      this.signalValue.set(event.payload.value);
    }
  }

  /**
   * Connects to a live telemetry server-sent event stream with exponential backoff.
   */
  public connectEventStream(streamUrl: string = '/api/events'): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return;
    }

    this.disconnect();

    try {
      this.eventSource = new EventSource(streamUrl);

      this.eventSource.onopen = () => {
        this.connectedSignal.set(true);
        this.reconnectAttemptSignal.set(0);
      };

      this.eventSource.onmessage = (msg: MessageEvent) => {
        try {
          const parsed = JSON.parse(msg.data) as TelemetryStreamEvent;
          this.handleStreamEvent(parsed);
        } catch {
          // Ignore unparseable frames to maintain resilient stream processing
        }
      };

      this.eventSource.onerror = () => {
        this.handleConnectionFailure(streamUrl);
      };
    } catch {
      this.handleConnectionFailure(streamUrl);
    }
  }

  /**
   * Calculates exponential backoff delay based on retry attempt index.
   */
  public calculateBackoffDelay(attempt: number): number {
    const delay = this.baseBackoffMs * Math.pow(2, attempt);
    return Math.min(delay, this.maxBackoffMs);
  }

  /**
   * Handles stream disconnection and schedules exponential backoff reconnection.
   */
  private handleConnectionFailure(streamUrl: string): void {
    this.connectedSignal.set(false);
    this.closeEventSource();

    const attempts = this.reconnectAttemptSignal() + 1;
    this.reconnectAttemptSignal.set(attempts);

    const delay = this.calculateBackoffDelay(attempts - 1);
    this.reconnectTimer = setTimeout(() => {
      this.connectEventStream(streamUrl);
    }, delay);
  }

  /**
   * Closes active EventSource connection cleanly.
   */
  private closeEventSource(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Disconnects active stream and clears any pending reconnection timers.
   */
  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.closeEventSource();
    this.connectedSignal.set(false);
  }
}
