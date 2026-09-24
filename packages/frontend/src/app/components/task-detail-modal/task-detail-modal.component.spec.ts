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
    expect(comp.activeTab()).toBe('stderr');
    expect(comp.extractTestStderr(store.selectedTask())).toContain('AssertionError');

    comp.copyText('npm run test:fast', 'Copied!');
    expect(comp.copiedMessage()).toBe('Copied!');

    comp.handleEscape();
    expect(store.selectedTask()).toBeNull();
  });
});
