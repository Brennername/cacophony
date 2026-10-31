import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { TaskHistoryComponent } from './task-history.component';
import {
  HistoryMetricsService,
  HistoryItem,
  ModelLeaderboardEntry,
} from '../../services/history-metrics.service';
import { ArenaStateStore } from '../../services/arena-state.store';

describe('TaskHistoryComponent (T102.1.7)', () => {
  let component: TaskHistoryComponent;
  let fixture: ComponentFixture<TaskHistoryComponent>;

  const mockHistoryItemsSignal = signal<HistoryItem[]>([]);
  const mockLeaderboardSignal = signal<ModelLeaderboardEntry[]>([]);
  const mockSuccessRateSignal = signal<number>(85);

  const mockSelectTask = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    mockHistoryItemsSignal.set([
      {
        id: 'task-1',
        title: 'Task Alpha',
        status: 'PASSED',
        durationMs: 45000,
        tokensPerSec: 28.5,
        model: 'phi4:latest',
        prNumber: 1,
        prUrl: 'http://localhost:19634/NeXeN/cacophony/pulls/1',
        commitDiffUrl: 'http://localhost:19634/NeXeN/cacophony/commit/1',
        timestamp: '2026-10-30T10:00:00Z',
      },
      {
        id: 'task-2',
        title: 'Task Beta',
        status: 'FAILED',
        durationMs: 800,
        tokensPerSec: 15.0,
        model: 'qwen2.5-coder:7b-instruct-q4_K_M',
        prNumber: 2,
        prUrl: '',
        commitDiffUrl: '',
        failureReason: 'SyntaxError',
        timestamp: '2026-10-30T11:00:00Z',
      },
    ]);

    mockLeaderboardSignal.set([
      {
        modelId: 'phi4:latest',
        successRate: 91,
        totalRuns: 11,
        avgTokensPerSec: 28.5,
        status: 'HEALTHY',
      },
      {
        modelId: 'qwen2.5-coder:7b-instruct-q4_K_M',
        successRate: 80,
        totalRuns: 10,
        avgTokensPerSec: 22.0,
        status: 'HEALTHY',
      },
    ]);

    mockSuccessRateSignal.set(85);

    await TestBed.configureTestingModule({
      imports: [TaskHistoryComponent],
      providers: [
        {
          provide: HistoryMetricsService,
          useValue: {
            historyItems: mockHistoryItemsSignal,
            leaderboard: mockLeaderboardSignal,
            rollingSuccessRate: mockSuccessRateSignal,
          },
        },
        {
          provide: ArenaStateStore,
          useValue: {
            selectTask: mockSelectTask,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and compute pagination and item lists', () => {
    expect(component.historyItems().length).toBe(2);
    expect(component.totalPages()).toBe(1);
    expect(component.paginatedHistoryItems().length).toBe(2);
    expect(component.currentPage()).toBe(1);
    expect(component.successRate()).toBe(85);
  });

  it('should update current page within valid bounds', () => {
    // Generate 30 items to produce 2 pages
    const thirtyItems: HistoryItem[] = Array.from({ length: 30 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      status: 'PASSED',
      durationMs: 1000,
      tokensPerSec: 20,
      model: 'phi4:latest',
      prNumber: i,
      prUrl: '',
      commitDiffUrl: '',
      timestamp: '2026-10-30T10:00:00Z',
    }));
    mockHistoryItemsSignal.set(thirtyItems);

    expect(component.totalPages()).toBe(2);

    component.setPage(2);
    expect(component.currentPage()).toBe(2);
    expect(component.paginatedHistoryItems().length).toBe(5);

    // Invalid page boundary
    component.setPage(5);
    expect(component.currentPage()).toBe(2);

    component.setPage(0);
    expect(component.currentPage()).toBe(2);
  });

  it('should format duration accurately across milliseconds, seconds, and minutes', () => {
    expect(component.formatDuration(null)).toBe('--');
    expect(component.formatDuration(0)).toBe('--');
    expect(component.formatDuration(500)).toBe('500ms');
    expect(component.formatDuration(25400)).toBe('25.4s');
    expect(component.formatDuration(125000)).toBe('2m 5s');
  });

  it('should format token velocity to one decimal place', () => {
    expect(component.formatTks(null)).toBe('0.0');
    expect(component.formatTks(28.456)).toBe('28.5');
    expect(component.formatTks(0)).toBe('0.0');
  });

  it('should format timestamps gracefully and handle invalid strings', () => {
    expect(component.formatTimestamp(null)).toBe('Recently');
    expect(component.formatTimestamp('Recently')).toBe('Recently');
    expect(component.formatTimestamp('invalid-date')).toBe('invalid-date');

    const formatted = component.formatTimestamp('2026-10-30T12:30:45Z');
    expect(formatted.length).toBeGreaterThan(5);
  });

  it('should call store.selectTask when drillDown is invoked', () => {
    component.drillDown('task-1');
    expect(mockSelectTask).toHaveBeenCalledWith('task-1');
  });
});
