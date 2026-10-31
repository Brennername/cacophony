import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ReactiveSignalService, type TelemetryStreamEvent } from './reactive-signal.service';

describe('ReactiveSignalService (T102.13.6)', () => {
  let service: ReactiveSignalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReactiveSignalService],
    });
    service = TestBed.inject(ReactiveSignalService);
  });

  afterEach(() => {
    service.disconnect();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with null signal value and disconnected state', () => {
    expect(service.value()).toBeNull();
    expect(service.getSignalValue()).toBeNull();
    expect(service.isConnected()).toBe(false);
    expect(service.reconnectAttempts()).toBe(0);
    expect(service.successPercentage()).toBe(0);
  });

  it('should update signal value and return via getSignalValue', () => {
    service.setSignalValue(0.75);
    expect(service.value()).toBe(0.75);
    expect(service.getSignalValue()).toBe(0.75);

    service.setSignalValue(null);
    expect(service.value()).toBeNull();
    expect(service.getSignalValue()).toBeNull();
  });

  it('should compute successPercentage accurately from ratio or absolute numbers', () => {
    service.setSignalValue(0.85);
    expect(service.successPercentage()).toBe(85);

    service.setSignalValue(42);
    expect(service.successPercentage()).toBe(42);

    service.setSignalValue(1.5);
    expect(service.successPercentage()).toBe(2);

    service.setSignalValue(-10);
    expect(service.successPercentage()).toBe(0);

    service.setSignalValue(Number.NaN);
    expect(service.successPercentage()).toBe(0);
  });

  it('should update signal values through handleStreamEvent for direct and payload formats', () => {
    const directEvent: TelemetryStreamEvent = {
      type: 'telemetry_sample',
      value: 0.92,
      timestamp: Date.now(),
    };
    service.handleStreamEvent(directEvent);
    expect(service.value()).toBe(0.92);

    const payloadEvent: TelemetryStreamEvent = {
      type: 'metric_update',
      payload: { value: 0.64, name: 'cpu_load' },
    };
    service.handleStreamEvent(payloadEvent);
    expect(service.value()).toBe(0.64);
  });

  it('should calculate exponential backoff delay correctly and clamp to maxBackoffMs', () => {
    expect(service.calculateBackoffDelay(0)).toBe(1000);
    expect(service.calculateBackoffDelay(1)).toBe(2000);
    expect(service.calculateBackoffDelay(2)).toBe(4000);
    expect(service.calculateBackoffDelay(3)).toBe(8000);
    expect(service.calculateBackoffDelay(4)).toBe(16000);
    expect(service.calculateBackoffDelay(5)).toBe(30000); // Clamped at 30s
    expect(service.calculateBackoffDelay(10)).toBe(30000);
  });

  it('should handle mock EventSource lifecycle, messages, and disconnection', () => {
    const handlers: {
      onopen: (() => void) | null;
      onmessage: ((event: MessageEvent) => void) | null;
      onerror: (() => void) | null;
    } = {
      onopen: null,
      onmessage: null,
      onerror: null,
    };
    const closeSpy = vi.fn();

    class MockEventSource {
      public set onopen(cb: () => void) {
        handlers.onopen = cb;
      }
      public set onmessage(cb: (e: MessageEvent) => void) {
        handlers.onmessage = cb;
      }
      public set onerror(cb: () => void) {
        handlers.onerror = cb;
      }
      public close(): void {
        closeSpy();
      }
    }

    vi.stubGlobal('EventSource', MockEventSource);

    service.connectEventStream('/api/events');

    // Simulate connection open
    handlers.onopen?.();
    expect(service.isConnected()).toBe(true);
    expect(service.reconnectAttempts()).toBe(0);

    // Simulate incoming valid message
    handlers.onmessage?.({
      data: JSON.stringify({ type: 'telemetry', value: 0.88 }),
    } as MessageEvent);
    expect(service.value()).toBe(0.88);

    // Simulate unparseable message
    handlers.onmessage?.({
      data: 'malformed json',
    } as MessageEvent);
    expect(service.value()).toBe(0.88); // Value preserved

    // Disconnect cleanly
    service.disconnect();
    expect(service.isConnected()).toBe(false);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should trigger reconnection backoff on EventSource error', () => {
    vi.useFakeTimers();

    const handlers: {
      onerror: (() => void) | null;
    } = {
      onerror: null,
    };
    class MockEventSource {
      public onopen: (() => void) | null = null;
      public onmessage: ((e: MessageEvent) => void) | null = null;
      public set onerror(cb: () => void) {
        handlers.onerror = cb;
      }
      public close = vi.fn();
    }

    vi.stubGlobal('EventSource', MockEventSource);

    service.connectEventStream('/api/events');
    expect(service.reconnectAttempts()).toBe(0);

    // Simulate error
    handlers.onerror?.();

    expect(service.isConnected()).toBe(false);
    expect(service.reconnectAttempts()).toBe(1);

    // Advance timer past backoff delay (1000ms for attempt 1)
    vi.advanceTimersByTime(1050);

    // Reconnection triggered and attempt counter preserved
    expect(service.reconnectAttempts()).toBe(1);
  });
});
