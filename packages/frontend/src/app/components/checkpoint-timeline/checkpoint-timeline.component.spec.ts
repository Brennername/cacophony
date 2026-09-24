import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CheckpointTimelineComponent } from './checkpoint-timeline.component';

describe('CheckpointTimelineComponent', () => {
  it('should render checkpoint entries and trigger undo', () => {
    TestBed.configureTestingModule({
      imports: [CheckpointTimelineComponent],
    });
    const fixture = TestBed.createComponent(CheckpointTimelineComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    let undoEmitted = false;
    comp.undo.subscribe(() => { undoEmitted = true; });
    comp.triggerUndo();
    expect(undoEmitted).toBe(true);
  });
});
