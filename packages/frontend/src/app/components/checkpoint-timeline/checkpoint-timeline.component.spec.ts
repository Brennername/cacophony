import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckpointTimelineComponent, CheckpointRecord } from './checkpoint-timeline.component';

describe('CheckpointTimelineComponent', () => {
  let component: CheckpointTimelineComponent;
  let fixture: ComponentFixture<CheckpointTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckpointTimelineComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckpointTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render checkpoint entries and trigger undo', () => {
    const mockCheckpoints: CheckpointRecord[] = [
      { id: '1', hash: '1111111', message: 'Initial state', createdAt: '10:00:00', filesChanged: 1 },
      { id: '2', hash: '2222222', message: 'State after change', createdAt: '10:05:00', filesChanged: 2 }
    ];

    fixture.componentRef.setInput('checkpoints', mockCheckpoints);
    fixture.detectChanges();

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
    const mockCheckpoints: CheckpointRecord[] = [
      { id: '1', hash: '1111111', message: 'Initial state', createdAt: '10:00:00', filesChanged: 1 },
      { id: '2', hash: '2222222', message: 'State after change', createdAt: '10:05:00', filesChanged: 2 }
    ];

    fixture.componentRef.setInput('checkpoints', mockCheckpoints);
    fixture.detectChanges();

    // Trigger a checkpoint selection
    component.selectCheckpoint('2');

    // Check if the diff text is rendered correctly
    expect(component.diffText).toBe('State after change\n- Initial state');
  });
});