import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TaskInspectorComponent } from './task-inspector.component';
import { ArenaStateStore, type TaskItem } from '../../services/arena-state.store';

describe('TaskInspectorComponent', () => {
  let store: ArenaStateStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TaskInspectorComponent],
      providers: [ArenaStateStore],
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
});
