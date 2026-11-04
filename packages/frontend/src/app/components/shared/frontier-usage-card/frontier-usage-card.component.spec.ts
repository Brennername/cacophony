import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FrontierUsageCardComponent } from './frontier-usage-card.component';
import type { VaultUsageSummary, VaultLimitsConfig } from '@cacophony/shared-types';

describe('FrontierUsageCardComponent (T-S10.4)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FrontierUsageCardComponent],
    });
  });

  it('should render usage card with title and provider badge', () => {
    const fixture = TestBed.createComponent(FrontierUsageCardComponent);
    fixture.componentRef.setInput('title', 'Global Frontier Consumption');
    const mockSummary: VaultUsageSummary = {
      provider: 'anthropic',
      fiveHourTokens: 50000,
      fiveHourRequests: 12,
      fiveHourCostUsd: 1.25,
      sevenDayTokens: 250000,
      sevenDayRequests: 54,
      sevenDayCostUsd: 6.2,
      weeklyCostLimitUsd: 15.0,
      fiveHourTokenLimit: 250000,
      fiveHourUsagePercent: 20.0,
      weeklyUsagePercent: 41.3,
    };
    fixture.componentRef.setInput('summary', mockSummary);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.card-title')?.textContent).toContain('Global Frontier Consumption');
    expect(compiled.querySelector('.provider-badge')?.textContent).toContain('anthropic');
  });

  it('should compute status classes correctly based on percentage thresholds', () => {
    const fixture = TestBed.createComponent(FrontierUsageCardComponent);
    const comp = fixture.componentInstance;

    expect(comp.getStatusClass(50)).toBe('status-optimal');
    expect(comp.getStatusClass(75)).toBe('status-warning');
    expect(comp.getStatusClass(92)).toBe('status-danger');
  });

  it('should format token numbers with k and M units correctly', () => {
    const fixture = TestBed.createComponent(FrontierUsageCardComponent);
    const comp = fixture.componentInstance;

    expect(comp.formatTokens(500)).toBe('500');
    expect(comp.formatTokens(250000)).toBe('250.0k');
    expect(comp.formatTokens(1500000)).toBe('1.50M');
  });
});
