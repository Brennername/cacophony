import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { StageProgressBarComponent } from './stage-progress-bar.component';

describe('StageProgressBarComponent', () => {
  it('should render StageProgressBarComponent and calculate step progress', () => {
    TestBed.configureTestingModule({
      imports: [StageProgressBarComponent],
    });
    const fixture = TestBed.createComponent(StageProgressBarComponent);
    fixture.componentRef.setInput('progressPercent', 57);
    fixture.componentRef.setInput('tokensPerSec', 42.5);
    fixture.componentRef.setInput('currentStageNumber', 4);
    fixture.componentRef.setInput('activeStageLabel', '4/7 Scrubbing');
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.progressPercent()).toBe(57);
    expect(comp.tokensPerSec()).toBe(42.5);
    expect(comp.formattedTokensPerSec()).toBe('42.5');
    expect(comp.currentStageNumber()).toBe(4);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('4/7 Scrubbing');
    expect(compiled.textContent).toContain('42.5');
    expect(compiled.textContent).toContain('57%');

    // Test fixed-width element class presence
    const fixedEl = compiled.querySelector('.fixed-tks');
    expect(fixedEl).not.toBeNull();
    expect(fixedEl?.textContent?.trim()).toBe('42.5');

    // Test live matching with stream active
    fixture.componentRef.setInput('runTokensPerSec', 42.0);
    fixture.detectChanges();
    expect(comp.isLiveMatched()).toBe(true);
    expect(compiled.textContent).toContain('LIVE');

    // Test paused stream state when tokens stop or isLive is false
    fixture.componentRef.setInput('isLive', false);
    fixture.detectChanges();
    expect(comp.isLiveActive()).toBe(false);
    expect(compiled.textContent).toContain('PAUSED');

    // Test click to expand stage details
    expect(comp.expandedStage()).toBeNull();
    comp.selectStage(comp.stages()[0]!);
    expect(comp.expandedStage()?.name).toBe('planning');
  });
});
