import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { GanttTransportComponent } from './gantt-transport.component';

describe('GanttTransportComponent', () => {
  it('should render GanttTransportComponent with zoom controls and playhead', () => {
    TestBed.configureTestingModule({
      imports: [GanttTransportComponent],
    });
    const fixture = TestBed.createComponent(GanttTransportComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.zoomLevel()).toBe(1.0);
    comp.zoomIn();
    expect(comp.zoomLevel()).toBe(1.5);
    comp.zoomOut();
    expect(comp.zoomLevel()).toBe(1.0);

    comp.resetPlayhead();
    expect(comp.playheadPos()).toBe(0);

    expect(comp.inferenceSpans().length).toBeGreaterThanOrEqual(1);
    expect(comp.testSpans().length).toBeGreaterThanOrEqual(1);
    expect(comp.gitSpans().length).toBeGreaterThanOrEqual(1);
  });
});
