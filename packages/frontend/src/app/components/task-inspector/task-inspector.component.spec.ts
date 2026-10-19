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

  it('should adjust terminal height when resizing or using presets', () => {
    const mockTask: TaskItem = {
      id: 'task-resize-1',
      title: 'Terminal Resizer Test',
      status: 'RUNNING',
      priority: 'P1',
      role: 'engineer',
    };
    store.tasks.set([mockTask]);
    const fixture = TestBed.createComponent(TaskInspectorComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.terminalHeight()).toBe(380);

    comp.setTerminalHeight(220);
    expect(comp.terminalHeight()).toBe(220);

    comp.setTerminalHeight(680);
    expect(comp.terminalHeight()).toBe(680);

    // Clamps to min/max
    comp.setTerminalHeight(50);
    expect(comp.terminalHeight()).toBe(180);

    comp.setTerminalHeight(2000);
    expect(comp.terminalHeight()).toBe(1200);
  });

  it('should display dynamic stage chips and switch between stage outputs', () => {
    const mockTask: TaskItem = {
      id: 'task-multi-stage-1',
      title: 'Multi Stage Verification',
      status: 'RUNNING',
      priority: 'P0',
      role: 'engineer',
      stages: [
        {
          id: 'st-plan',
          stageName: 'planning',
          stageStatus: 'SUCCESS',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 120,
          logOutput: 'Plan: Add resizable handle to terminal box',
        },
        {
          id: 'st-gen',
          stageName: 'generation',
          stageStatus: 'SUCCESS',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 2400,
          logOutput: 'export function render() { return true; }',
        },
        {
          id: 'st-test',
          stageName: 'test_execution',
          stageStatus: 'SUCCESS',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 1800,
          logOutput: 'Exit Code: 0\n[STDOUT]:\nTAP version 13\nok 1 - test passes\n1..1',
        },
        {
          id: 'st-review',
          stageName: 'remediation',
          stageStatus: 'SUCCESS',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 900,
          logOutput: 'Verdict: APPROVED\nSOLID score: 98/100\nNo defects found.',
        },
      ],
    };

    store.tasks.set([mockTask]);
    const fixture = TestBed.createComponent(TaskInspectorComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    const entries = comp.allStageEntries();
    expect(entries.length).toBe(4);
    expect(entries[0].label).toContain('Planning');
    expect(entries[1].label).toContain('Generation');
    expect(entries[2].label).toContain('Test Execution');
    expect(entries[3].label).toContain('Code Review');

    // Selecting test stage
    comp.selectStreamChannel('stage-st-test', true);
    fixture.detectChanges();
    expect(comp.currentChannelLogContent()).toContain('TAP version 13');

    // Selecting review stage
    comp.selectStreamChannel('stage-st-review', true);
    fixture.detectChanges();
    expect(comp.currentChannelLogContent()).toContain('Verdict: APPROVED');
  });

  it('should toggle accordion mode and expand/collapse stage cards', () => {
    const mockTask: TaskItem = {
      id: 'task-accordion-1',
      title: 'Accordion View Verification',
      status: 'RUNNING',
      priority: 'P1',
      role: 'engineer',
      stages: [
        {
          id: 'st-1',
          stageName: 'planning',
          stageStatus: 'SUCCESS',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 100,
          logOutput: 'Planning step log content',
        },
        {
          id: 'st-2',
          stageName: 'test_execution',
          stageStatus: 'FAILURE',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 500,
          logOutput: 'FAIL test/auth.test.ts: assertion failed',
        },
      ],
    };

    store.tasks.set([mockTask]);
    const fixture = TestBed.createComponent(TaskInspectorComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.viewMode.set('accordion');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.accordion-content-scroll')).toBeTruthy();

    // Only RUNNING stages are open by default; completed and failed stages are closed
    expect(comp.isStageAccordionOpen('stage-st-2')).toBe(false);

    // Expand single stage
    comp.toggleStageAccordion('stage-st-2');
    expect(comp.isStageAccordionOpen('stage-st-2')).toBe(true);

    // Collapse all
    comp.collapseAllStages();
    expect(comp.isStageAccordionOpen('stage-st-2')).toBe(false);

    // Expand all
    comp.expandAllStages();
    expect(comp.isStageAccordionOpen('stage-st-1')).toBe(true);
    expect(comp.isStageAccordionOpen('stage-st-2')).toBe(true);
  });

  it('should translate vertical wheel scroll over stage tabs bar to horizontal scroll and prevent vertical jitter', () => {
    const fixture = TestBed.createComponent(TaskInspectorComponent);
    const comp = fixture.componentInstance;

    const fakeContainer = document.createElement('div');
    fakeContainer.scrollLeft = 20;

    let defaultPrevented = false;
    const fakeEvent = {
      deltaY: 50,
      deltaX: 0,
      currentTarget: fakeContainer,
      preventDefault: () => {
        defaultPrevented = true;
      },
    } as unknown as WheelEvent;

    comp.onStageTabsWheel(fakeEvent);

    expect(defaultPrevented).toBe(true);
    expect(fakeContainer.scrollLeft).toBe(70);
  });

  it('should render ANSI styled output safely via renderAnsi', () => {
    const fixture = TestBed.createComponent(TaskInspectorComponent);
    const comp = fixture.componentInstance;

    const ansiOutput = '\u001b[32mPASS\u001b[0m \u001b[1;31mFAIL\u001b[0m <script>safe</script>';
    const html = comp.renderAnsi(ansiOutput);

    expect(html).toContain('class="ansi-fg-green"');
    expect(html).toContain('class="ansi-bold ansi-fg-red"');
    expect(html).toContain('&lt;script&gt;safe&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('should handle dynamic stage tabs arrow navigation', () => {
    const mockTask: TaskItem = {
      id: 'task-tabs-overflow',
      title: 'Dynamic Stage Tabs Overflow Test',
      status: 'RUNNING',
      priority: 'P1',
      role: 'engineer',
      stages: [
        { id: '1', stageName: 'planning', stageStatus: 'SUCCESS', durationMs: 100, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
        { id: '2', stageName: 'generation', stageStatus: 'SUCCESS', durationMs: 200, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
        { id: '3', stageName: 'deterministic_scrub', stageStatus: 'SUCCESS', durationMs: 150, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
        { id: '4', stageName: 'test_execution', stageStatus: 'RUNNING', durationMs: 300, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
        { id: '5', stageName: 'remediation', stageStatus: 'PENDING', durationMs: null, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
        { id: '6', stageName: 'pr_review', stageStatus: 'PENDING', durationMs: null, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
      ],
    };

    store.tasks.set([mockTask]);
    const fixture = TestBed.createComponent(TaskInspectorComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;

    // Simulate scroll overflow
    comp.canScrollStageTabsLeft.set(true);
    comp.canScrollStageTabsRight.set(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const leftArrow = compiled.querySelector('.stage-tab-nav-arrow.left') as HTMLButtonElement;
    const rightArrow = compiled.querySelector('.stage-tab-nav-arrow.right') as HTMLButtonElement;

    expect(leftArrow).toBeTruthy();
    expect(rightArrow).toBeTruthy();

    // Call scrollStageTabs in both directions without errors
    comp.scrollStageTabs('left');
    comp.scrollStageTabs('right');
  });

  it('should keep accordions closed by default except the currently RUNNING stage', () => {
    const mockTask: TaskItem = {
      id: 'task-accordion-test',
      title: 'Accordion Default Behavior Test',
      status: 'RUNNING',
      priority: 'P1',
      role: 'engineer',
      stages: [
        { id: 'st-1', stageName: 'planning', stageStatus: 'SUCCESS', durationMs: 120, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), logOutput: 'Planning done' },
        { id: 'st-2', stageName: 'generation', stageStatus: 'FAILURE', durationMs: 450, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), logOutput: 'Gen attempt 1 failed' },
        { id: 'st-3', stageName: 'generation', stageStatus: 'RUNNING', durationMs: 0, startedAt: new Date().toISOString(), completedAt: null, logOutput: '' },
        { id: 'st-4', stageName: 'test_execution', stageStatus: 'PENDING', durationMs: null, startedAt: new Date().toISOString(), completedAt: null },
      ],
    };

    store.tasks.set([mockTask]);
    const fixture = TestBed.createComponent(TaskInspectorComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    // Check default accordion states
    expect(comp.isStageAccordionOpen('stage-st-1')).toBe(false); // SUCCESS stage is closed
    expect(comp.isStageAccordionOpen('stage-st-2')).toBe(false); // FAILURE stage is closed
    expect(comp.isStageAccordionOpen('stage-st-3')).toBe(true);  // RUNNING stage is OPEN
    expect(comp.isStageAccordionOpen('stage-st-4')).toBe(false); // PENDING stage is closed

    // User explicitly toggles stage-st-1 open
    comp.toggleStageAccordion('stage-st-1');
    expect(comp.isStageAccordionOpen('stage-st-1')).toBe(true);

    // User explicitly toggles stage-st-3 closed
    comp.toggleStageAccordion('stage-st-3');
    expect(comp.isStageAccordionOpen('stage-st-3')).toBe(false);
  });

  it('should isolate historical stage attempt outputs from live generation stream buffer', () => {
    const mockTask: TaskItem = {
      id: 'task-multi-attempt',
      title: 'Multi Attempt Generation Fidelity Test',
      status: 'RUNNING',
      priority: 'P1',
      role: 'engineer',
      stages: [
        { id: 'att-1', stageName: 'generation', stageStatus: 'FAILURE', durationMs: 2500, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), logOutput: 'const codeV1 = "first attempt syntax error";' },
        { id: 'att-2', stageName: 'generation', stageStatus: 'SUCCESS', durationMs: 3100, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), logOutput: 'const codeV2 = "second attempt passed scrub";' },
        { id: 'att-3', stageName: 'generation', stageStatus: 'RUNNING', durationMs: 0, startedAt: new Date().toISOString(), completedAt: null, logOutput: '' },
      ],
    };

    store.tasks.set([mockTask]);
    store.liveStreamBuffer.set('const codeV3 = "live third attempt token stream...";');

    const fixture = TestBed.createComponent(TaskInspectorComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    const entries = comp.allStageEntries();
    expect(entries.length).toBe(3);

    // Attempt 1 (FAILURE) must retain authentic recorded output, NOT the live stream buffer!
    expect(entries[0].label).toBe('Generation');
    expect(entries[0].logContent).toBe('const codeV1 = "first attempt syntax error";');

    // Attempt 2 (SUCCESS) must retain authentic recorded output, NOT the live stream buffer!
    expect(entries[1].label).toContain('(Attempt 2)');
    expect(entries[1].logContent).toBe('const codeV2 = "second attempt passed scrub";');

    // Attempt 3 (RUNNING) should use the live stream buffer!
    expect(entries[2].label).toContain('(Attempt 3)');
    expect(entries[2].logContent).toContain('live third attempt token stream');
  });

  it('should identify reduced stage logs with isLogReduced', () => {
    const fixture = TestBed.createComponent(TaskInspectorComponent);
    const comp = fixture.componentInstance;

    expect(comp.isLogReduced(null)).toBe(false);
    expect(comp.isLogReduced('Normal verbose vitest test logs')).toBe(false);
    expect(comp.isLogReduced("The log of this has been reduced, this is it's histogram:\nDuration: 4200ms\nStatus: FAILURE")).toBe(true);
  });
});


