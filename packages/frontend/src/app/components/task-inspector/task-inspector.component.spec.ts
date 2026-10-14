import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TaskInspectorComponent } from './task-inspector.component';
import { ArenaStateStore, type TaskItem } from '../../services/arena-state.store';

import { TaskApiService } from '../../services/task-api.service';

describe('TaskInspectorComponent', () => {
  let store: ArenaStateStore;
  let mockTaskApi: { replayStreamForTask: (id: string) => Promise<string> };

  beforeEach(() => {
    mockTaskApi = {
      replayStreamForTask: async (id: string) => `[Historical Replay for ${id}]: Stage output replay verified`,
    };

    TestBed.configureTestingModule({
      imports: [TaskInspectorComponent],
      providers: [
        ArenaStateStore,
        { provide: TaskApiService, useValue: mockTaskApi },
      ],
    });
    store = TestBed.inject(ArenaStateStore);
  });

  it('should render empty state when no active task is running', () => {
    store.tasks.set([]);
    const fixture = TestBed.createComponent(TaskInspectorComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
  });

  it('should render active task information and switch sub-stage tabs', () => {
    const mockTask: TaskItem = {
      id: 'task-test-99',
      title: 'Implement AST Scrubbing Taps',
      status: 'RUNNING',
      priority: 'P1',
      role: 'engineer',
      tokensPerSec: 28.5,
      logSnippet: 'Initial output stream content',
      stages: [
        {
          id: 'task-test-99-planning',
          stageName: 'planning',
          stageStatus: 'SUCCESS',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 150,
        },
      ],
    };

    store.tasks.set([mockTask]);
    store.testOutputBuffer.set('PASS dist/tests/sample.test.js (42ms)');
    store.astScrubbingBuffer.set('[CompilerDiagnosticAutoRepair] Applied 2 repairs');
    store.reviewCritiqueBuffer.set('[PR Review] APPROVED');

    const fixture = TestBed.createComponent(TaskInspectorComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.task-title')?.textContent).toContain('Implement AST Scrubbing Taps');

    const tabButtons = compiled.querySelectorAll('.stream-tab-btn');
    expect(tabButtons.length).toBe(5);

    fixture.componentInstance.activeStreamChannel.set('testing');
    fixture.detectChanges();
    const testContent = compiled.querySelector('.test-content');
    expect(testContent?.textContent).toContain('PASS dist/tests/sample.test.js');

    fixture.componentInstance.activeStreamChannel.set('ast');
    fixture.detectChanges();
    const astContent = compiled.querySelector('.ast-content');
    expect(astContent?.textContent).toContain('CompilerDiagnosticAutoRepair');

    fixture.componentInstance.activeStreamChannel.set('review');
    fixture.detectChanges();
    const reviewContent = compiled.querySelector('.review-content');
    expect(reviewContent?.textContent).toContain('PR Review');
  });

  it('should compute and display Generation Health Watchdog indicators', () => {
    const mockTask: TaskItem = {
      id: 'task-watchdog-1',
      title: 'Watchdog Heartbeat Verification',
      status: 'RUNNING',
      priority: 'P0',
      role: 'architect',
    };

    store.tasks.set([mockTask]);
    store.generationHeartbeat.set({
      taskId: 'task-watchdog-1',
      modelId: 'qwen2.5-coder:7b',
      state: 'ingesting_prompt',
      elapsedMs: 1400,
      promptIngestionMs: 1400,
      timeToFirstTokenMs: null,
      tokensEmitted: 0,
      instantaneousTps: 0,
      idleMs: 1400,
      timestamp: Date.now(),
    });

    const fixture = TestBed.createComponent(TaskInspectorComponent);
    fixture.detectChanges();

    let compiled = fixture.nativeElement as HTMLElement;
    let badge = compiled.querySelector('.heartbeat-badge');
    expect(badge).toBeTruthy();
    expect(badge?.classList.contains('badge-ingesting')).toBe(true);
    expect(badge?.textContent).toContain('Ingesting Prompt');

    store.generationHeartbeat.set({
      taskId: 'task-watchdog-1',
      modelId: 'qwen2.5-coder:7b',
      state: 'stalled',
      elapsedMs: 8200,
      promptIngestionMs: 8200,
      timeToFirstTokenMs: null,
      tokensEmitted: 0,
      instantaneousTps: 0,
      idleMs: 8200,
      timestamp: Date.now(),
    });
    fixture.detectChanges();

    badge = compiled.querySelector('.heartbeat-badge');
    expect(badge?.classList.contains('badge-stalled')).toBe(true);
    expect(badge?.textContent).toContain('Stall Warning');
  });

  it('should switch cleanly between live SSE streaming and historical stage replay (T67.4.4)', async () => {
    const liveTask: TaskItem = {
      id: 'task-live-1',
      title: 'Active Live Inference Task',
      status: 'RUNNING',
      priority: 'P0',
      role: 'implementer',
    };

    const completedTask: TaskItem = {
      id: 'task-completed-1',
      title: 'Historical Completed Task',
      status: 'COMPLETED',
      priority: 'P1',
      role: 'architect',
    };

    store.tasks.set([liveTask, completedTask]);
    store.isStreamActive.set(true);
    store.liveStreamBuffer.set('Live token stream executing...');

    const fixture = TestBed.createComponent(TaskInspectorComponent);
    fixture.detectChanges();

    // 1. Initially inspecting active RUNNING task: should show LIVE status and live buffer
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.hud-pill')?.textContent?.trim()).toBe('LIVE');
    expect(compiled.querySelector('.terminal-content')?.textContent).toContain('Live token stream executing...');

    // 2. Select completed task for inspection: should transition to COMPLETED status and historical replay
    await fixture.componentInstance.selectTaskToInspect(completedTask);
    fixture.detectChanges();

    expect(compiled.querySelector('.hud-pill')?.textContent?.trim()).toBe('COMPLETED');
    expect(compiled.querySelector('.terminal-content')?.textContent).toContain('[Historical Replay for task-completed-1]');

    // 3. Select running task again: should switch back to LIVE status and live buffer
    await fixture.componentInstance.selectTaskToInspect(liveTask);
    fixture.detectChanges();

    expect(compiled.querySelector('.hud-pill')?.textContent?.trim()).toBe('LIVE');
    expect(compiled.querySelector('.terminal-content')?.textContent).toContain('Live token stream executing...');
  });

  it('T88.2.4: should display assessment round, assessor model, verdict, CI outcome, and queue stage', () => {
    const taskWithLineage: TaskItem = {
      id: 'task-lineage-100',
      title: 'Fix Authentication Token Leak',
      status: 'RUNNING',
      priority: 'P0',
      role: 'fixer',
      workItemId: 'wi-9090',
      lineageStage: 'fix',
      assessmentRound: 2,
      headSha: 'c0ffee12345678',
      stageRoundKey: 'wi-9090:fix:r2:c0ffee12',
      findingIds: ['f-1', 'f-2'],
      assessmentVerdict: 'REQUEST_CHANGES',
      assessorModel: 'qwen2.5-coder:7b',
      ciOutcome: 'PASSED',
      findingsCount: 2,
      criticalCount: 1,
      prUrl: 'http://localhost:3000/org/repo/pulls/12',
    };

    store.tasks.set([taskWithLineage]);
    const fixture = TestBed.createComponent(TaskInspectorComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const strip = compiled.querySelector('.assessment-lineage-strip');
    expect(strip).toBeTruthy();
    expect(strip?.textContent).toContain('R2');
    expect(strip?.textContent).toContain('qwen2.5-coder:7b');
    expect(strip?.textContent).toContain('REQUEST_CHANGES');
    expect(strip?.textContent).toContain('PASSED');
    expect(strip?.textContent).toContain('fix');
    expect(strip?.textContent).toContain('wi-9090');
    expect(strip?.textContent).toContain('c0ffee12');
    expect(strip?.textContent).toContain('2 (1 crit)');
  });
});

