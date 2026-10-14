import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  TestFilterToolbarComponent,
  TestFilterOption,
} from './test-filter-toolbar.component';

describe('TestFilterToolbarComponent (T65.3)', () => {
  let fixture: ComponentFixture<TestFilterToolbarComponent>;
  let component: TestFilterToolbarComponent;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [TestFilterToolbarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestFilterToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render all filter pills with correct initial badges', () => {
    fixture.componentRef.setInput('totalCount', 10);
    fixture.componentRef.setInput('passedCount', 7);
    fixture.componentRef.setInput('failedCount', 2);
    fixture.componentRef.setInput('runningCount', 1);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const allPill = compiled.querySelector('#filter-pill-all');
    const passedPill = compiled.querySelector('#filter-pill-passed');
    const failedPill = compiled.querySelector('#filter-pill-failed');
    const runningPill = compiled.querySelector('#filter-pill-running');

    expect(allPill?.textContent).toContain('10');
    expect(passedPill?.textContent).toContain('7');
    expect(failedPill?.textContent).toContain('2');
    expect(runningPill?.textContent).toContain('1');
  });

  it('should emit filterChange when a different pill is clicked', () => {
    let emittedFilter: TestFilterOption | null = null;
    component.filterChange.subscribe((filter) => {
      emittedFilter = filter;
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const failedBtn = compiled.querySelector('#filter-pill-failed') as HTMLButtonElement;
    failedBtn.click();
    fixture.detectChanges();

    expect(emittedFilter).toBe('FAILED');
  });

  it('should debounce search input changes by 200ms before emitting', () => {
    let emittedSearch: string | null = null;
    component.searchChange.subscribe((search) => {
      emittedSearch = search;
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const searchInput = compiled.querySelector('#test-search-input') as HTMLInputElement;

    searchInput.value = 'taskcade-t65';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Before 200ms, searchChange should not have fired
    vi.advanceTimersByTime(100);
    expect(emittedSearch).toBeNull();

    // After 200ms debounce expires, searchChange should fire with trimmed term
    vi.advanceTimersByTime(150);
    expect(emittedSearch).toBe('taskcade-t65');
  });

  it('should clear search input and immediately emit empty string', () => {
    let emittedSearch: string | null = null;
    component.searchChange.subscribe((search) => {
      emittedSearch = search;
    });

    // Populate search
    component.searchInputState.set('failing-test');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const clearBtn = compiled.querySelector('.clear-btn') as HTMLButtonElement;
    expect(clearBtn).not.toBeNull();

    clearBtn.click();
    fixture.detectChanges();

    expect(component.searchInputState()).toBe('');
    expect(emittedSearch).toBe('');
  });
});
