import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ModelsViewComponent } from './models-view.component';
import { HistoryMetricsService } from '../../services/history-metrics.service';
import { of } from 'rxjs';

describe('ModelsViewComponent - Epoch Management & Leaderboard Suite (T82.5)', () => {
  let metricsService: HistoryMetricsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ModelsViewComponent],
      providers: [
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
});
