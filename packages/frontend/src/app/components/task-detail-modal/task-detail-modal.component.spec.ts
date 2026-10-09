import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TaskDetailModalComponent } from './task-detail-modal.component';
import { ArenaStateStore } from '../../services/arena-state.store';

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

    // Verify modal element and resize grip exist
    const compiled = fixture.nativeElement as HTMLElement;
    const modalEl = compiled.querySelector('.modal-content') as HTMLElement;
    const resizeGrip = compiled.querySelector('.modal-resize-grip') as HTMLElement;
    const tabBar = compiled.querySelector('.tab-bar') as HTMLElement;

    expect(modalEl).toBeTruthy();
    expect(resizeGrip).toBeTruthy();
    expect(tabBar).toBeTruthy();

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
    const resizeGrip = compiled.querySelector('.modal-resize-grip') as HTMLElement;

    let defaultPrevented = false;
    let propagationStopped = false;
    const mockPointerEvent = {
      preventDefault: () => { defaultPrevented = true; },
      stopPropagation: () => { propagationStopped = true; },
      clientX: 500,
      clientY: 400,
      currentTarget: resizeGrip,
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
    const resizeGrip = compiled.querySelector('.modal-resize-grip') as HTMLElement;

    // 1. When resizing via grip handle, releasing on backdrop must not dismiss the dialog
    comp.startResize({
      preventDefault: () => {},
      stopPropagation: () => {},
      clientX: 500,
      clientY: 400,
      currentTarget: resizeGrip,
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
});