import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { DashboardViewComponent } from './dashboard-view.component';
import { ArenaStateStore, TaskItem } from '../../../services/arena-state.store';
import { HistoryMetricsService, HistoryItem } from '../../../services/history-metrics.service';

describe('DashboardViewComponent', () => {
  let component: DashboardViewComponent;
  let fixture: ComponentFixture<DashboardViewComponent>;
  let store: ArenaStateStore;
  let metricsService: HistoryMetricsService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardViewComponent],
      providers: [
        provideRouter([
          { path: 'dashboard', children: [] },
          { path: 'queue', children: [] },
          { path: 'history', children: [] },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => null } },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardViewComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(ArenaStateStore);
    metricsService = TestBed.inject(HistoryMetricsService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should render DashboardViewComponent with dense card sections and snapshots', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.dashboard-grid')).toBeTruthy();
    expect(compiled.querySelector('app-hardware-monitor')).toBeTruthy();
    expect(compiled.querySelector('app-task-inspector')).toBeTruthy();
    expect(compiled.querySelector('app-windowed-success-trend')).toBeTruthy();

    const snapshotCards = compiled.querySelectorAll('.snapshot-card');
    expect(snapshotCards.length).toBe(2);

    const queueSnapshot = snapshotCards[0];
    expect(queueSnapshot.querySelector('.snapshot-title')?.textContent?.trim()).toBe('Task Queue');
    expect(queueSnapshot.querySelector('.stepper-label')?.textContent?.trim()).toBe('Entries Shown: 5');

    const historySnapshot = snapshotCards[1];
    expect(historySnapshot.querySelector('.snapshot-title')?.textContent?.trim()).toBe('Task History');
    expect(historySnapshot.querySelector('.stepper-label')?.textContent?.trim()).toBe('Entries Shown: 5');
  });

  it('should dynamically increment and decrement queue entries shown count', () => {
    expect(component.queueShownCount()).toBe(5);

    component.incrementQueueShown();
    fixture.detectChanges();
    expect(component.queueShownCount()).toBe(6);

    component.decrementQueueShown();
    fixture.detectChanges();
    expect(component.queueShownCount()).toBe(5);

    // Decrement down to minimum of 1
    for (let i = 0; i < 10; i++) {
      component.decrementQueueShown();
    }
    fixture.detectChanges();
    expect(component.queueShownCount()).toBe(1);
  });

  it('should dynamically increment and decrement history entries shown count', () => {
    expect(component.historyShownCount()).toBe(5);

    component.incrementHistoryShown();
    fixture.detectChanges();
    expect(component.historyShownCount()).toBe(6);

    component.decrementHistoryShown();
    fixture.detectChanges();
    expect(component.historyShownCount()).toBe(5);

    // Decrement down to minimum of 1
    for (let i = 0; i < 10; i++) {
      component.decrementHistoryShown();
    }
    fixture.detectChanges();
    expect(component.historyShownCount()).toBe(1);
  });

  it('should render cardlets and drill down when clicked', () => {
    const mockTasks: TaskItem[] = [
      {
        id: 'task-101',
        title: 'Refactor Arena Scheduler',
        status: 'PENDING',
        priority: 'P0',
        role: 'implementer',
        modelAssigned: 'qwen2.5-coder:7b',
        createdAt: '2026-11-04T12:00:00.000Z',
      },
      {
        id: 'task-102',
        title: 'Add Thumb Pad Scroll To Top',
        status: 'RUNNING',
        priority: 'P1',
        role: 'implementer',
        modelAssigned: 'deepseek-r1:14b',
        createdAt: '2026-11-04T12:05:00.000Z',
      },
    ];
    store.tasks.set(mockTasks);

    const mockHistory: HistoryItem[] = [
      {
        id: 'hist-201',
        title: 'Fix Gitea Lockfile Mismatch',
        status: 'PASSED',
        durationMs: 4500,
        tokensPerSec: 32.4,
        model: 'qwen2.5-coder:7b',
        prNumber: 42,
        prUrl: 'http://localhost:3000/repo/pulls/42',
        commitDiffUrl: 'http://localhost:3000/repo/commit/abc',
        timestamp: '2026-11-04T11:30:00.000Z',
      },
    ];
    metricsService.historyItems.set(mockHistory);
    fixture.detectChanges();

    const selectSpy = vi.spyOn(store, 'selectTask');

    const compiled = fixture.nativeElement as HTMLElement;
    const snapshotWrappers = compiled.querySelectorAll('.snapshot-wrapper');
    expect(snapshotWrappers.length).toBe(2);

    const queueCardlets = snapshotWrappers[0].querySelectorAll('.snapshot-cardlet');
    expect(queueCardlets.length).toBe(2);

    (queueCardlets[0] as HTMLElement).click();
    expect(selectSpy).toHaveBeenCalledWith('task-101');

    const historyCardlets = snapshotWrappers[1].querySelectorAll('.snapshot-cardlet');
    expect(historyCardlets.length).toBe(1);

    (historyCardlets[0] as HTMLElement).click();
    expect(selectSpy).toHaveBeenCalledWith('hist-201');
  });

  it('should navigate to queue route and scroll to top when All button is clicked', async () => {
    const navSpy = vi.spyOn(router, 'navigateByUrl');
    const scrollSpy = vi.spyOn(component, 'scrollToTop');

    const queueAllBtn = fixture.nativeElement.querySelector('#dash-queue-all-btn') as HTMLButtonElement;
    expect(queueAllBtn).toBeTruthy();
    queueAllBtn.click();

    expect(navSpy).toHaveBeenCalledWith('/queue');
    expect(scrollSpy).toHaveBeenCalled();
  });

  it('should navigate to history route and scroll to top when All button is clicked', async () => {
    const navSpy = vi.spyOn(router, 'navigateByUrl');
    const scrollSpy = vi.spyOn(component, 'scrollToTop');

    const historyAllBtn = fixture.nativeElement.querySelector('#dash-history-all-btn') as HTMLButtonElement;
    expect(historyAllBtn).toBeTruthy();
    historyAllBtn.click();

    expect(navSpy).toHaveBeenCalledWith('/history');
    expect(scrollSpy).toHaveBeenCalled();
  });
});
