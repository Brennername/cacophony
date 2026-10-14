import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ArenaStateStore } from './arena-state.store';

describe('ArenaStateStore - successRate signal updates (T96.4.3)', () => {
  let store: ArenaStateStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ArenaStateStore],
    });
    store = TestBed.inject(ArenaStateStore);
  });

  it('should initialize successRate with 100%', () => {
    expect(store.successRate()).toBe(100);
  });

  it('should update successRate signal accurately when updated', () => {
    store.setSuccessRate(94.2);
    expect(store.successRate()).toBe(94.2);

    store.setSuccessRate(78.5);
    expect(store.successRate()).toBe(78.5);
  });

  it('should support boundary values from 0% to 100%', () => {
    store.setSuccessRate(0);
    expect(store.successRate()).toBe(0);

    store.setSuccessRate(100);
    expect(store.successRate()).toBe(100);
  });
});
