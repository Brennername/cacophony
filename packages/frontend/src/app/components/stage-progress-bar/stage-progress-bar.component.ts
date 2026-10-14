import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StageStepInfo {
  index: number;
  name: string;
  label: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILURE';
  tokensSent?: number;
  tokensReceived?: number;
  durationMs?: number;
}

/**
 * Animated segmented progress bar displaying active stage name,
 * intra-stage token progress indicators, velocity meters, and click-to-expand drawer.
 */
@Component({
  selector: 'app-stage-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stage-progress-bar.component.html',
  styleUrl: './stage-progress-bar.component.css',
})
export class StageProgressBarComponent {
  public progressPercent = input<number>(0);
  public tokensPerSec = input<number>(0);
  public runTokensPerSec = input<number | undefined>(undefined);
  public isLive = input<boolean | undefined>(undefined);
  public currentStageNumber = input<number>(1);
  public activeStageLabel = input<string>('Planning');

  public readonly formattedTokensPerSec = computed(() => {
    return (this.tokensPerSec() || 0).toFixed(1);
  });

  public readonly formattedRunTokensPerSec = computed(() => {
    const run = this.runTokensPerSec();
    return run !== undefined ? run.toFixed(1) : null;
  });

  public readonly isLiveActive = computed(() => {
    const explicit = this.isLive();
    if (explicit !== undefined) return explicit;
    return (this.tokensPerSec() || 0) > 0.1;
  });

  // Retain isLiveMatched as alias for backward compatibility
  public readonly isLiveMatched = computed(() => this.isLiveActive());

  public readonly hasRun = computed(() => {
    return this.runTokensPerSec() !== undefined || (this.tokensPerSec() || 0) > 0;
  });

  public stages = input<StageStepInfo[]>([
    { index: 1, name: 'planning', label: '1/7 Planning', status: 'SUCCESS', durationMs: 120 },
    { index: 2, name: 'context_assembly', label: '2/7 Context Assembly', status: 'SUCCESS', durationMs: 250 },
    { index: 3, name: 'generation', label: '3/7 Generation', status: 'RUNNING', tokensReceived: 340 },
    { index: 4, name: 'deterministic_scrub', label: '4/7 Scrubbing', status: 'PENDING' },
    { index: 5, name: 'test_execution', label: '5/7 Test Verification', status: 'PENDING' },
    { index: 6, name: 'remediation', label: '6/7 Remediation', status: 'PENDING' },
    { index: 7, name: 'pr_review', label: '7/7 PR Review', status: 'PENDING' },
  ]);

  public expandedStage = signal<StageStepInfo | null>(null);

  public selectStage(stage: StageStepInfo): void {
    this.expandedStage.set(stage);
  }
}
