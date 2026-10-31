import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FrontierModalComponent, DecomposedTaskPreview } from './frontier-modal.component';

describe('FrontierModalComponent (T102.1.8)', () => {
  let component: FrontierModalComponent;
  let fixture: ComponentFixture<FrontierModalComponent>;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [FrontierModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FrontierModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize closed with empty goal and preview lists', () => {
    expect(component.isOpen()).toBe(false);
    expect(component.goalText()).toBe('');
    expect(component.isAnalyzing()).toBe(false);
    expect(component.previews()).toEqual([]);
  });

  it('should open and close modal dialog and reset state on close', () => {
    component.open();
    expect(component.isOpen()).toBe(true);

    component.goalText.set('Implement distributed caching');
    component.previews.set([{ title: 'Cache test', role: 'tester', priority: 'P1' }]);

    component.close();
    expect(component.isOpen()).toBe(false);
    expect(component.goalText()).toBe('');
    expect(component.previews()).toEqual([]);
    expect(component.isAnalyzing()).toBe(false);
  });

  it('should simulate feature decomposition and populate task previews', () => {
    component.open();
    component.goalText.set('Build Gitea webhook gateway');

    component.simulateDecomposition();
    expect(component.isAnalyzing()).toBe(true);

    vi.advanceTimersByTime(600);

    expect(component.isAnalyzing()).toBe(false);
    expect(component.previews().length).toBe(3);
    expect(component.previews()[0]?.role).toBe('architect');
    expect(component.previews()[1]?.role).toBe('implementer');
    expect(component.previews()[2]?.role).toBe('test_engineer');
  });

  it('should emit committed with previews and close modal when committing tasks', () => {
    let emittedTasks: DecomposedTaskPreview[] | undefined;
    component.committed.subscribe((tasks) => {
      emittedTasks = tasks;
    });

    const mockPreviews: DecomposedTaskPreview[] = [
      { title: 'Schema migration', role: 'architect', priority: 'P0' },
      { title: 'Service implementation', role: 'implementer', priority: 'P1' },
    ];

    component.open();
    component.previews.set(mockPreviews);

    component.commitTasks();

    expect(emittedTasks).toEqual(mockPreviews);
    expect(component.isOpen()).toBe(false);
  });
});
