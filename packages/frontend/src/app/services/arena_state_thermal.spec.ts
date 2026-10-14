import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ArenaStateStore } from './arena-state.store';

describe('ArenaStateStore - thermalThrottleState signal updates (T96.4.4)', () => {
  let store: ArenaStateStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ArenaStateStore],
    });
    store = TestBed.inject(ArenaStateStore);
  });

  it('should initialize thermalThrottleState with nominal', () => {
    expect(store.thermalThrottleState()).toBe('nominal');
  });

  it('should update thermalThrottleState to throttling and critical', () => {
    store.setThermalThrottleState('throttling');
    expect(store.thermalThrottleState()).toBe('throttling');

    store.setThermalThrottleState('critical');
    expect(store.thermalThrottleState()).toBe('critical');

    store.setThermalThrottleState('nominal');
    expect(store.thermalThrottleState()).toBe('nominal');
  });
});
