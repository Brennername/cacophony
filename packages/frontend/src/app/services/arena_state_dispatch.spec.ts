import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ArenaStateStore } from './arena-state.store';

describe('ArenaStateStore - activeTaskId transitions (T96.4.1)', () => {
  let store: ArenaStateStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ArenaStateStore],
    });
    store = TestBed.inject(ArenaStateStore);
  });

  it('should initialize activeTaskId signal with null', () => {
    expect(store.activeTaskId()).toBeNull();
  });

  it('should transition activeTaskId reactively upon task dispatch', () => {
    store.setActiveTaskId('task-cade-101');
    expect(store.activeTaskId()).toBe('task-cade-101');

    store.setActiveTaskId('task-cade-102');
    expect(store.activeTaskId()).toBe('task-cade-102');
  });

  it('should reset activeTaskId back to null when task completes or resets', () => {
    store.setActiveTaskId('task-cade-101');
    expect(store.activeTaskId()).toBe('task-cade-101');

    store.setActiveTaskId(null);
    expect(store.activeTaskId()).toBeNull();
  });
});
