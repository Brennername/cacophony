import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { GanttTransportComponent, type GanttSpan } from './gantt-transport.component';

describe('GanttTransportComponent', () => {
  it('should initialize with default zoom and support zoomIn and zoomOut controls', () => {
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
  });

  it('should lock playhead to 50% center line once playback exceeds half-window duration', () => {
    TestBed.configureTestingModule({
      imports: [GanttTransportComponent],
    });
    const fixture = TestBed.createComponent(GanttTransportComponent);
    fixture.componentRef.setInput('isRunning', true);
    fixture.componentRef.setInput('spans', [
      {
        id: '1',
        name: 'Planning',
        category: 'planning',
        startOffsetMs: 0,
        durationMs: 500,
        status: 'SUCCESS'
      },
      {
        id: '2',
        name: 'Generation',
        category: 'inference',
        startOffsetMs: 500,
        durationMs: 15000,
        status: 'RUNNING'
      }
    ] as GanttSpan[]);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.isFitted()).toBe(true);

    // In full mode (isFitted = false, 20s window, half-window 10s):
    comp.isFitted.set(false);
    // At t=0ms, playhead is at 0%
    comp.currentPlayheadMs.set(0);
    expect(comp.playheadPercent()).toBe(0);

    // At t=5000ms (within 20s window, half-window is 10s), playhead moves towards 50%
    comp.currentPlayheadMs.set(5000);
    expect(comp.playheadPercent()).toBe(25);

    // At t=10000ms (halfWindowMs), playhead reaches exactly 50% center
    comp.currentPlayheadMs.set(10000);
    expect(comp.playheadPercent()).toBe(50);

    // Beyond halfWindowMs (e.g. 25000ms), playhead remains locked at 50%
    comp.currentPlayheadMs.set(25000);
    expect(comp.playheadPercent()).toBe(50);

    // In fitted mode (isFitted = true): playhead still never exceeds 50%
    comp.isFitted.set(true);
    expect(comp.playheadPercent()).toBe(50);
  });

  it('should correctly format millisecond and second time displays', () => {
    TestBed.configureTestingModule({
      imports: [GanttTransportComponent],
    });
    const fixture = TestBed.createComponent(GanttTransportComponent);
    const comp = fixture.componentInstance;

    expect(comp.formatTime(500)).toBe('500ms');
    expect(comp.formatTime(15000)).toBe('15.0s');
    expect(comp.formatTime(65000)).toBe('1m 5.0s');
  });

  it('should filter spans by category and compute display duration', () => {
    TestBed.configureTestingModule({
      imports: [GanttTransportComponent],
    });
    const fixture = TestBed.createComponent(GanttTransportComponent);
    fixture.componentRef.setInput('spans', [
      {
        id: 's1',
        name: 'Planning',
        category: 'planning',
        startOffsetMs: 0,
        durationMs: 300,
        status: 'SUCCESS'
      },
      {
        id: 's2',
        name: 'Generation',
        category: 'inference',
        startOffsetMs: 300,
        durationMs: 4000,
        status: 'RUNNING'
      }
    ] as GanttSpan[]);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    const planSpans = comp.getSpansForCategory('planning');
    expect(planSpans.length).toBe(1);
    expect(planSpans[0]?.name).toBe('Planning');

    const infSpans = comp.getSpansForCategory('inference');
    expect(infSpans.length).toBe(1);
    expect(infSpans[0]?.name).toBe('Generation');
  });
});
