import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CheckpointTimelineComponent } from './checkpoint-timeline.component';

describe('CheckpointTimelineComponent', () => {
  let component: CheckpointTimelineComponent;
  let fixture;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CheckpointTimelineComponent],
    });
    fixture = TestBed.createComponent(CheckpointTimelineComponent);
    component = fixture.componentInstance;
  });

  it('should render checkpoint entries and trigger undo', () => {
    // Mock the checkpoints data
    component.checkpoints = [
      { id: '1', text: 'Initial state' },
      { id: '2', text: 'State after change' }
    ];

    // Trigger a checkpoint selection
    component.selectCheckpoint('2');

    // Check if the diff drawer opens
    expect(component.diffDrawerOpen).toBe(true);

    // Mock the undo functionality
    let undoEmitted = false;
    component.undo.subscribe(() => { undoEmitted = true; });
    component.triggerUndo();
    expect(undoEmitted).toBe(true);
  });

  it('should render diff text on checkpoint selection', () => {
    // Mock the checkpoints data
    component.checkpoints = [
      { id: '1', text: 'Initial state' },
      { id: '2', text: 'State after change' }
    ];

    // Trigger a checkpoint selection
    component.selectCheckpoint('2');

    // Check if the diff text is rendered correctly
    expect(component.diffText).toBe('State after change\n- Initial state');
  });
});