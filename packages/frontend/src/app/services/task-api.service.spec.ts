import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TaskApiService, ToastService, TaskDto } from './task-api.service';

describe('TaskApiService', () => {
  let service: TaskApiService;
  let toastService: ToastService;

  beforeEach(() => {
    vi.restoreAllMocks();
    TestBed.configureTestingModule({
      providers: [TaskApiService, ToastService],
    });
    service = TestBed.inject(TaskApiService);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with loading false and error null', () => {
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
  });

  it('should list tasks successfully and update loading state', async () => {
    const mockTasks: TaskDto[] = [
      { id: 'task-1', title: 'Task 1', prompt: 'Prompt 1' },
      { id: 'task-2', title: 'Task 2', prompt: 'Prompt 2' },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasks,
    } as Response);

    const tasks = await service.listTasks();
    expect(tasks.length).toBe(2);
    expect(tasks[0]?.id).toBe('task-1');
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
  });

  it('should set error signal and return empty array when listTasks fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const tasks = await service.listTasks();
    expect(tasks).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(service.error()).toContain('HTTP 500');
  });

  it('should create a task successfully via POST', async () => {
    const newDto: TaskDto = {
      title: 'New Bugfix',
      prompt: 'Fix memory leak in buffer',
      role: 'implementer',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...newDto, id: 'created-task-id' }),
    } as Response);

    const created = await service.createTask(newDto);
    expect(created).not.toBeNull();
    expect(created?.id).toBe('created-task-id');
    expect(created?.title).toBe('New Bugfix');
  });

  it('should show and auto-clear toast in ToastService', () => {
    vi.useFakeTimers();
    toastService.showToast('Task queued', 'success');

    const active = toastService.activeToast();
    expect(active).not.toBeNull();
    expect(active?.message).toBe('Task queued');
    expect(active?.type).toBe('success');

    vi.advanceTimersByTime(3000);
    expect(toastService.activeToast()).toBeNull();
    vi.useRealTimers();
  });
});
