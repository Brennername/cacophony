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

    component.selectCheckpoint('2');

    expect(component.diffDrawerOpen).toBe(true);

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

    component.selectCheckpoint('2');

    expect(component.diffText).toBe('State after change\n- Initial state');
  });

  it('should disable undo button at initial state', () => {
    const mockCheckpoints: CheckpointRecord[] = [
      { id: '1', hash: '1111111', message: 'Initial state', createdAt: '10:00:00', filesChanged: 1 }
    ];

    fixture.componentRef.setInput('checkpoints', mockCheckpoints);
    fixture.detectChanges();

    expect(component.canUndo()).toBe(false);
  });

  it('should enable undo button after selecting a checkpoint', () => {
    const mockCheckpoints: CheckpointRecord[] = [
      { id: '1', hash: '1111111', message: 'Initial state', createdAt: '10:00:00', filesChanged: 1 },
      { id: '2', hash: '2222222', message: 'State after change', createdAt: '10:05:00', filesChanged: 2 }
    ];

    fixture.componentRef.setInput('checkpoints', mockCheckpoints);
    fixture.detectChanges();

    component.selectCheckpoint('2');

    expect(component.canUndo()).toBe(true);
  });

  it('should disable redo button at initial state', () => {
    const mockCheckpoints: CheckpointRecord[] = [
      { id: '1', hash: '1111111', message: 'Initial state', createdAt: '10:00:00', filesChanged: 1 }
    ];

    fixture.componentRef.setInput('checkpoints', mockCheckpoints);
    fixture.detectChanges();

    expect(component.canRedo()).toBe(false);
  });

  it('should enable redo button after triggering undo', () => {
    const mockCheckpoints: CheckpointRecord[] = [
      { id: '1', hash: '1111111', message: 'Initial state', createdAt: '10:00:00', filesChanged: 1 },
      { id: '2', hash: '2222222', message: 'State after change', createdAt: '10:05:00', filesChanged: 2 }
    ];

    fixture.componentRef.setInput('checkpoints', mockCheckpoints);
    fixture.detectChanges();

    component.selectCheckpoint('2');
    component.triggerUndo();

    expect(component.canRedo()).toBe(true);
  });

  it('should trigger API call on undo', () => {
    const mockCheckpoints: CheckpointRecord[] = [
      { id: '1', hash: '1111111', message: 'Initial state', createdAt: '10:00:00', filesChanged: 1 },
      { id: '2', hash: '2222222', message: 'State after change', createdAt: '10:05:00', filesChanged: 2 }
    ];

    fixture.componentRef.setInput('checkpoints', mockCheckpoints);
    fixture.detectChanges();

    component.selectCheckpoint('2');
    const undoSpy = vi.spyOn(component.undo, 'emit');

    component.triggerUndo();
    expect(undoSpy).toHaveBeenCalled();
  });

  it('should trigger API call on redo', () => {
    const mockCheckpoints: CheckpointRecord[] = [
      { id: '1', hash: '1111111', message: 'Initial state', createdAt: '10:00:00', filesChanged: 1 },
      { id: '2', hash: '2222222', message: 'State after change', createdAt: '10:05:00', filesChanged: 2 }
    ];

    fixture.componentRef.setInput('checkpoints', mockCheckpoints);
    fixture.detectChanges();

    component.selectCheckpoint('2');
    component.triggerUndo();
    const redoSpy = vi.spyOn(component.redo, 'emit');

    component.triggerRedo();
    expect(redoSpy).toHaveBeenCalled();
  });

  it('should emit checkpointSelected event on checkpoint selection', () => {
    const mockCheckpoints: CheckpointRecord[] = [
      { id: '1', hash: '1111111', message: 'Initial state', createdAt: '10:00:00', filesChanged: 1 },
      { id: '2', hash: '2222222', message: 'State after change', createdAt: '10:05:00', filesChanged: 2 }
    ];

    fixture.componentRef.setInput('checkpoints', mockCheckpoints);
    fixture.detectChanges();

    const checkpointSelectedSpy = vi.spyOn(component.checkpointSelected, 'emit');

    component.selectCheckpoint('2');
    expect(checkpointSelectedSpy).toHaveBeenCalledWith('2');
  });
});