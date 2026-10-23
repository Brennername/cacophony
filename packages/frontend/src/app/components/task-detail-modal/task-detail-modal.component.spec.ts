import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TaskDetailModalComponent } from './task-detail-modal.component';
import { ArenaStateStore } from '../../services/arena-state.store';
import { TaskApiService } from '../../services/task-api.service';

describe('TaskDetailModalComponent', () => {
  it('should render TaskDetailModalComponent with tab navigation and copy actions', () => {
    TestBed.configureTestingModule({
      imports: [TaskDetailModalComponent],
    });

    const store = TestBed.inject(ArenaStateStore);
    store.selectedTask.set({
      id: 'task-modal-test',
      title: 'Drilldown Test Task',
      status: 'RUNNING',
      priority: 'P0',
      role: 'implementer',
      prompt: 'Build resilient subsystem',
      testCommand: 'npm run test:fast',
      stages: [
        {
          id: '1',
          stageName: 'generation',
          stageStatus: 'SUCCESS',
          logOutput: 'Generating code...',
          durationMs: 1200,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        },
        {
          id: '2',
          stageName: 'test_execution',
          stageStatus: 'FAILURE',
          logOutput: 'FAIL src/app.spec.ts\nAssertionError: expected true to be false',
          durationMs: 450,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        }
      ]
    });

    const fixture = TestBed.createComponent(TaskDetailModalComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.activeTab()).toBe('overview');

    comp.activeTab.set('stages');
    expect(comp.activeTab()).toBe('stages');

    comp.activeTab.set('diffs');
    expect(comp.activeTab()).toBe('diffs');

    comp.activeTab.set('stderr');
    expect(comp.extractTestStderr(store.selectedTask())).toContain('AssertionError');

    comp.activeTab.set('reviews');
    expect(comp.activeTab()).toBe('reviews');

    expect(comp.formatPrLinkText('http://localhost:3000/repos/cacophony/core/pulls/42')).toBe('Gitea PR #42');
    expect(comp.formatPrLinkText('https://github.com/my-org/cacophony/pull/108')).toBe('GitHub PR #108');
    expect(comp.formatPrLinkText('')).toBe('View PR');

    comp.copyText('npm run test:fast', 'Copied!');
    expect(comp.copiedMessage()).toBe('Copied!');

    comp.handleEscape();
    expect(store.selectedTask()).toBeNull();
  });

  it('maintains static dialog dimensions across tab changes and allows user resizing', () => {
    TestBed.configureTestingModule({
      imports: [TaskDetailModalComponent],
    });

    const store = TestBed.inject(ArenaStateStore);
    store.selectedTask.set({
      id: 'task-modal-resize-test',
      title: 'Modal Resize Test',
      status: 'RUNNING',
      priority: 'P1',
      role: 'implementer',
      stages: [
        {
          id: 's1',
          stageName: 'generation',
          stageStatus: 'SUCCESS',
          logOutput: 'Line 1\nLine 2\nLine 3',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 350,
        },
      ],
    });

    const fixture = TestBed.createComponent(TaskDetailModalComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    // Initial custom dimensions are null, letting static stylesheet rules define 860px x 640px
    expect(comp.customWidth()).toBeNull();
    expect(comp.customHeight()).toBeNull();

    // Verify modal element and ensure footer resize grip is removed (only single dialog resize corner exists)
    const compiled = fixture.nativeElement as HTMLElement;
    const modalEl = compiled.querySelector('.modal-content') as HTMLElement;
    const footerResizeGrip = compiled.querySelector('.modal-resize-grip');
    const tabBar = compiled.querySelector('.tab-bar') as HTMLElement;

    expect(modalEl).toBeTruthy();
    expect(footerResizeGrip).toBeNull();
    expect(tabBar).toBeTruthy();

    // Verify renderAnsi helper transforms ANSI sequences in logs/streams
    expect(comp.renderAnsi('\u001b[32mPASS\u001b[0m')).toBe('<span class="ansi-fg-green">PASS</span>');

    // Switch between tabs: dimensions remain null (static CSS size) without expansion
    comp.activeTab.set('stages');
    fixture.detectChanges();
    expect(comp.customWidth()).toBeNull();
    expect(comp.customHeight()).toBeNull();

    comp.activeTab.set('diffs');
    fixture.detectChanges();
    expect(comp.customWidth()).toBeNull();
    expect(comp.customHeight()).toBeNull();

    // User explicitly resizes the modal
    comp.customWidth.set(920);
    comp.customHeight.set(700);
    fixture.detectChanges();

    expect(modalEl.style.width).toBe('920px');
    expect(modalEl.style.height).toBe('700px');

    // Switching back to stages tab retains the user-defined static dimensions
    comp.activeTab.set('stages');
    fixture.detectChanges();
    expect(comp.customWidth()).toBe(920);
    expect(comp.customHeight()).toBe(700);
    expect(modalEl.style.width).toBe('920px');
    expect(modalEl.style.height).toBe('700px');
  });

  it('triggers interactive startResize pointer handling', () => {
    TestBed.configureTestingModule({
      imports: [TaskDetailModalComponent],
    });

    const store = TestBed.inject(ArenaStateStore);
    store.selectedTask.set({
      id: 'task-drag-test',
      title: 'Drag Test',
      status: 'PENDING',
      priority: 'P2',
      role: 'reviewer',
    });

    const fixture = TestBed.createComponent(TaskDetailModalComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;
    const modalEl = compiled.querySelector('.modal-content') as HTMLElement;

    let defaultPrevented = false;
    let propagationStopped = false;
    const mockPointerEvent = {
      preventDefault: () => { defaultPrevented = true; },
      stopPropagation: () => { propagationStopped = true; },
      clientX: 500,
      clientY: 400,
      currentTarget: modalEl,
    } as unknown as PointerEvent;

    comp.startResize(mockPointerEvent);
    expect(defaultPrevented).toBe(true);
    expect(propagationStopped).toBe(true);

    // Simulate pointer move event
    const moveEvent = new PointerEvent('pointermove', {
      clientX: 550,
      clientY: 460,
    });
    window.dispatchEvent(moveEvent);

    expect(comp.customWidth()).toBeGreaterThan(0);
    expect(comp.customHeight()).toBeGreaterThan(0);

    // Simulate pointer up event
    const upEvent = new PointerEvent('pointerup');
    window.dispatchEvent(upEvent);
  });

  it('prevents dialog dismissal during and after resizing', () => {
    TestBed.configureTestingModule({
      imports: [TaskDetailModalComponent],
    });

    const store = TestBed.inject(ArenaStateStore);
    store.selectedTask.set({
      id: 'task-no-dismiss-test',
      title: 'No Dismiss Test',
      status: 'RUNNING',
      priority: 'P0',
      role: 'implementer',
    });

    const fixture = TestBed.createComponent(TaskDetailModalComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;
    const backdropEl = compiled.querySelector('.modal-backdrop') as HTMLElement;
    const modalContent = compiled.querySelector('.modal-content') as HTMLElement;

    // 1. When resizing via corner handle, releasing on backdrop must not dismiss the dialog
    comp.startResize({
      preventDefault: () => {},
      stopPropagation: () => {},
      clientX: 500,
      clientY: 400,
      currentTarget: modalContent,
    } as unknown as PointerEvent);

    expect(comp.isResizing).toBe(true);
    expect(comp.justResized).toBe(true);

    // Backdrop click attempt during resize
    const mockBackdropClick = {
      target: backdropEl,
      currentTarget: backdropEl,
      preventDefault: () => {},
      stopPropagation: () => {},
    } as unknown as MouseEvent;

    comp.onBackdropClick(mockBackdropClick);
    expect(store.selectedTask()).not.toBeNull();

    // End resize
    window.dispatchEvent(new PointerEvent('pointerup'));
    expect(comp.isResizing).toBe(false);
    expect(comp.justResized).toBe(true);

    // Immediate click right after resize should still be suppressed
    comp.onBackdropClick(mockBackdropClick);
    expect(store.selectedTask()).not.toBeNull();

    // 2. Dragging starting inside modal content and ending on backdrop must not dismiss
    comp.justResized = false;
    comp.onBackdropMouseDown({ target: modalContent } as unknown as MouseEvent);
    comp.onBackdropClick(mockBackdropClick);
    expect(store.selectedTask()).not.toBeNull();

    // 3. Native CSS resize sync sets justResized to protect against trailing dismissal
    comp.syncNativeResize();
    expect(store.selectedTask()).not.toBeNull();

    // 4. Clean intentional click on backdrop (mousedown on backdrop + click on backdrop) dismisses
    comp.justResized = false;
    comp.onBackdropMouseDown({ target: backdropEl } as unknown as MouseEvent);
    comp.onBackdropClick(mockBackdropClick);
    expect(store.selectedTask()).toBeNull();
  });

  it('renders debug-diagnostics-panel with post-mortem failure telemetry and handles retry', async () => {
    TestBed.configureTestingModule({
      imports: [TaskDetailModalComponent],
    });

    const store = TestBed.inject(ArenaStateStore);
    store.selectedTask.set({
      id: 'task-diag-test',
      title: 'Diagnostic Test Task',
      status: 'FAILED',
      priority: 'P0',
      role: 'implementer',
    });

    const fixture = TestBed.createComponent(TaskDetailModalComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;

    // Switch to diagnostics tab
    comp.activeTab.set('diagnostics');
    fixture.detectChanges();
    expect(comp.activeTab()).toBe('diagnostics');

    // Supply diagnostic post-mortem data
    comp.diagnosticData.set({
      taskId: 'task-diag-test',
      foundOnDisk: true,
      loggedAt: new Date().toISOString(),
      model: 'qwen2.5-coder:7b',
      testCommand: 'npm test',
      exitCode: 1,
      stderr: 'FAIL: Expected 42 but received undefined',
      preScrubbedOutput: 'function computeAnswer() { return undefined; }',
      scrubberDiff: '--- computeAnswer\n+++ computeAnswer',
      failureReason: 'Test execution failed verification gates',
    });
    comp.loadingDiagnostics.set(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const diagPanel = compiled.querySelector('.debug-diagnostics-panel');
    expect(diagPanel).not.toBeNull();

    const titleRow = compiled.querySelector('.diag-title-row');
    expect(titleRow?.textContent).toContain('Recorded Post-Mortem');
    expect(titleRow?.textContent).toContain('Exit Code: 1');

    const failureAlert = compiled.querySelector('.diag-failure-alert');
    expect(failureAlert?.textContent).toContain('Test execution failed verification gates');

    const codeBoxes = compiled.querySelectorAll('.code-box');
    expect(codeBoxes.length).toBe(3); // pre-scrubbed, diff, stderr

    // Mock global fetch for retry
    const origFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string' && input.includes('/retry')) {
        return {
          ok: true,
          json: async () => ({ success: true, taskId: 'task-diag-test', requeued: true }),
        } as Response;
      }
      return origFetch(input, init);
    };

    try {
      await comp.retryTask('task-diag-test');
      expect(comp.copiedMessage()).toContain('re-queued');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('manages side-scrolling tab bar navigation with scroll buttons and touch swipe', () => {
    TestBed.configureTestingModule({
      imports: [TaskDetailModalComponent],
    });

    const store = TestBed.inject(ArenaStateStore);
    store.selectedTask.set({
      id: 'task-tabs-scroll-test',
      title: 'Tabs Scroll Test',
      status: 'RUNNING',
      priority: 'P1',
      role: 'implementer',
    });

    const fixture = TestBed.createComponent(TaskDetailModalComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;
    const tabBarContainer = compiled.querySelector('.tab-bar-container');
    const tabBar = compiled.querySelector('.tab-bar') as HTMLElement;

    expect(tabBarContainer).toBeTruthy();
    expect(tabBar).toBeTruthy();

    // Verify selectTab switches activeTab and signals
    comp.selectTab('cognitive');
    expect(comp.activeTab()).toBe('cognitive');

    // Trigger tab scroll checks
    comp.checkTabScroll();
    expect(typeof comp.canScrollTabsLeft()).toBe('boolean');
    expect(typeof comp.canScrollTabsRight()).toBe('boolean');

    // Test scrollTabs left and right without throwing
    comp.scrollTabs('left');
    comp.scrollTabs('right');

    // Test touch gestures
    const mockTouchStart = {
      touches: [{ clientX: 200 }],
      currentTarget: tabBar,
    } as unknown as TouchEvent;
    comp.onTabTouchStart(mockTouchStart);

    const mockTouchMove = {
      touches: [{ clientX: 120 }],
      currentTarget: tabBar,
    } as unknown as TouchEvent;
    comp.onTabTouchMove(mockTouchMove);

    // Test window resize handler triggers checkTabScroll
    comp.onWindowResize();
  });

  it('T108.1: renders compact header typography and retry button without touch-target', () => {
    TestBed.configureTestingModule({
      imports: [TaskDetailModalComponent],
    });

    const store = TestBed.inject(ArenaStateStore);
    store.selectedTask.set({
      id: 'task-compact-header-test',
      title: 'Very Long Complex Architectural Specification Headline That Sprawls',
      status: 'PENDING',
      priority: 'P0',
      role: 'architect',
    });

    const fixture = TestBed.createComponent(TaskDetailModalComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const retryBtn = compiled.querySelector('.retry-task-header-btn');
    expect(retryBtn).toBeTruthy();
    expect(retryBtn?.classList.contains('touch-target')).toBe(false);

    const titleEl = compiled.querySelector('.header-titles h3');
    expect(titleEl).toBeTruthy();
    expect(titleEl?.textContent).toContain('Very Long Complex Architectural Specification');
  });

  it('T108.2: defaults embedded boxes to expanded and toggles shrunk state on demand', () => {
    TestBed.configureTestingModule({
      imports: [TaskDetailModalComponent],
    });

    const store = TestBed.inject(ArenaStateStore);
    store.selectedTask.set({
      id: 'task-shrink-test',
      title: 'Shrink Controls Test',
      status: 'COMPLETED',
      priority: 'P1',
      role: 'implementer',
      prompt: 'Detailed system directive',
      logSnippet: '+ const x = 1;\n- const x = 0;',
    });

    const fixture = TestBed.createComponent(TaskDetailModalComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    // Default: not shrunk
    expect(comp.isBoxShrunk('prompt')).toBe(false);
    expect(comp.isBoxShrunk('diff')).toBe(false);
    expect(comp.isBoxShrunk('stream')).toBe(false);

    // Toggle prompt shrink
    comp.toggleBoxShrink('prompt');
    expect(comp.isBoxShrunk('prompt')).toBe(true);
    expect(comp.isBoxShrunk('diff')).toBe(false);

    // Toggle prompt back to expanded
    comp.toggleBoxShrink('prompt');
    expect(comp.isBoxShrunk('prompt')).toBe(false);

    // Toggle multiple boxes
    comp.toggleBoxShrink('diff');
    comp.toggleBoxShrink('stream');
    expect(comp.isBoxShrunk('diff')).toBe(true);
    expect(comp.isBoxShrunk('stream')).toBe(true);
  });

  it('T108.8: renders PR discussion threads with domain tags and allows posting comments', async () => {
    TestBed.configureTestingModule({
      imports: [TaskDetailModalComponent],
    });

    const store = TestBed.inject(ArenaStateStore);
    const apiService = TestBed.inject(TaskApiService);
    apiService.getPrDiscussionThreads = async () => [];

    store.selectedTask.set({
      id: 'task-pr-thread-test',
      title: 'PR Discussion Test',
      status: 'COMPLETED',
      priority: 'P0',
      role: 'reviewer',
      prUrl: 'http://localhost:19634/NeXeN/cacophony/pulls/108',
    });

    const fixture = TestBed.createComponent(TaskDetailModalComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.activeTab.set('reviews');
    comp.loadingReview.set(false);
    comp.loadingPrThreads.set(false);
    fixture.detectChanges();

    // Populate mock threads
    comp.prThreads.set([
      {
        threadId: 'thread_sec_1',
        filePath: 'packages/engine/src/auth.ts',
        lineNumber: 42,
        isResolved: false,
        comments: [
          {
            id: 1,
            taskId: 'task-pr-thread-test',
            prIndex: 108,
            threadId: 'thread_sec_1',
            authorName: 'SecurityAdvisor',
            authorRole: 'model:security',
            domainTag: 'Security',
            filePath: 'packages/engine/src/auth.ts',
            lineNumber: 42,
            bodyContent: 'Validate CSRF tokens on mutating API routes.',
            isResolved: false,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const domainTagEl = compiled.querySelector('.thread-domain-tag');
    expect(domainTagEl).toBeTruthy();
    expect(domainTagEl?.textContent?.trim()).toBe('Security');

    const commentBodyEl = compiled.querySelector('.comment-bubble-text');
    expect(commentBodyEl?.textContent).toContain('Validate CSRF tokens');

    // Test comment submission input
    comp.newCommentText.set('Reviewed and confirmed CSRF guard implementation.');
    comp.selectedDomainTag.set('Security');

    let capturedPayload: any = null;
    apiService.addPrDiscussionComment = async (_taskId: string, payload: any) => {
      capturedPayload = payload;
      return {
        id: 2,
        taskId: 'task-pr-thread-test',
        prIndex: 108,
        threadId: payload.threadId,
        authorName: payload.authorName,
        authorRole: payload.authorRole,
        domainTag: payload.domainTag,
        filePath: null,
        lineNumber: null,
        bodyContent: payload.bodyContent,
        isResolved: false,
        createdAt: new Date().toISOString(),
      };
    };

    await comp.submitPrComment('task-pr-thread-test', 'thread_sec_1');
    expect(capturedPayload).toBeTruthy();
    expect(capturedPayload.bodyContent).toBe('Reviewed and confirmed CSRF guard implementation.');
    expect(capturedPayload.domainTag).toBe('Security');
    expect(comp.newCommentText()).toBe('');
  });
});