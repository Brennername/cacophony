import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ArenaStateStore } from './arena-state.store';

describe('ArenaStateStore - modelWarmth signal updates (T96.4.2)', () => {
  let store: ArenaStateStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ArenaStateStore],
    });
    store = TestBed.inject(ArenaStateStore);
  });

  it('should initialize with empty modelWarmth dictionary', () => {
    expect(store.modelWarmth()).toEqual({});
  });

  it('should update warmth state when model transitions to warming and warm', () => {
    store.setModelWarmth('qwen2.5-coder:7b', 'warming');
    expect(store.modelWarmth()['qwen2.5-coder:7b']).toBe('warming');

    store.setModelWarmth('qwen2.5-coder:7b', 'warm');
    expect(store.modelWarmth()['qwen2.5-coder:7b']).toBe('warm');
  });

  it('should maintain independent warmth states for multiple models concurrently', () => {
    store.setModelWarmth('qwen2.5-coder:7b', 'warm');
    store.setModelWarmth('deepseek-r1:8b', 'cold');
    store.setModelWarmth('gemma3:4b', 'warming');

    const warmth = store.modelWarmth();
    expect(warmth['qwen2.5-coder:7b']).toBe('warm');
    expect(warmth['deepseek-r1:8b']).toBe('cold');
    expect(warmth['gemma3:4b']).toBe('warming');
  });
});
