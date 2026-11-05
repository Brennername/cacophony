import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ModelsViewComponent } from './models-view.component';
import { HistoryMetricsService } from '../../../services/history-metrics.service';
import { of } from 'rxjs';

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('ModelsViewComponent - Epoch Management & Leaderboard Suite (T82.5)', () => {
  let metricsService: HistoryMetricsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ModelsViewComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(new Map([['model', null]])),
            snapshot: { paramMap: { get: () => null } },
          },
        },
      ],
    });
    metricsService = TestBed.inject(HistoryMetricsService);
  });

  it('should render ModelsViewComponent with epoch selector and default to current epoch', () => {
    const fixture = TestBed.createComponent(ModelsViewComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.selectedEpoch()).toBe('current');
    expect(comp.showEpochModal()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    const epochSelect = compiled.querySelector('#epoch-filter-select') as HTMLSelectElement;
    expect(epochSelect).toBeTruthy();
    expect(epochSelect.value).toBe('current');
  });

  it('should open epoch modal, populate default fields, and toggle visibility on close', () => {
    const fixture = TestBed.createComponent(ModelsViewComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.openEpochModal();
    fixture.detectChanges();

    expect(comp.showEpochModal()).toBe(true);
    expect(comp.epochNameInput()).toContain('Epoch');
    expect(comp.epochReasonInput()).toContain('Clean slate reset');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.epoch-modal')).toBeTruthy();

    comp.closeEpochModal();
    fixture.detectChanges();
    expect(comp.showEpochModal()).toBe(false);
    expect(compiled.querySelector('.epoch-modal')).toBeNull();
  });

  it('should update selectedEpoch when dropdown changes', () => {
    const fixture = TestBed.createComponent(ModelsViewComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    const fakeEvent = {
      target: { value: 'all' },
    } as unknown as Event;

    comp.onEpochSelected(fakeEvent);
    expect(comp.selectedEpoch()).toBe('all');
  });

  it('should toggle mobile drawer state with toggleMobileDrawer()', () => {
    const fixture = TestBed.createComponent(ModelsViewComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.mobileDrawerOpen()).toBe(false);

    comp.toggleMobileDrawer();
    expect(comp.mobileDrawerOpen()).toBe(true);

    comp.toggleMobileDrawer();
    expect(comp.mobileDrawerOpen()).toBe(false);
  });

  it('should open and close Add Model modal correctly', () => {
    const fixture = TestBed.createComponent(ModelsViewComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.showAddModelModal()).toBe(false);

    comp.openAddModelModal();
    expect(comp.showAddModelModal()).toBe(true);
    expect(comp.addModelTier()).toBe('ROSTER');

    comp.showAddModelModal.set(false);
    expect(comp.showAddModelModal()).toBe(false);
  });

  it('should render Fleet Model Leaderboard with sorted entries and allow selecting models', () => {
    metricsService.leaderboard.set([
      {
        modelId: 'phi4:latest',
        successRate: 95,
        totalRuns: 20,
        avgTokensPerSec: 32.5,
        status: 'HEALTHY',
      },
      {
        modelId: 'qwen2.5-coder:7b-instruct-q4_K_M',
        successRate: 80,
        totalRuns: 15,
        avgTokensPerSec: 24.0,
        status: 'HEALTHY',
      },
    ]);

    const fixture = TestBed.createComponent(ModelsViewComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.sortedLeaderboard().length).toBe(2);
    expect(comp.sortedLeaderboard()[0].modelId).toBe('phi4:latest');
    expect(comp.sortedLeaderboard()[0].successRate).toBe(95);

    const compiled = fixture.nativeElement as HTMLElement;
    const leaderboardCard = compiled.querySelector('.leaderboard-card');
    expect(leaderboardCard).toBeTruthy();

    const leaderItems = compiled.querySelectorAll('.leader-card-item');
    expect(leaderItems.length).toBe(2);

    // Clicking a leaderboard item selects that model
    (leaderItems[0] as HTMLElement).click();
    fixture.detectChanges();

    expect(comp.selectedModelId()).toBe('phi4:latest');
  });
});
