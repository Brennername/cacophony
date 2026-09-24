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
  template: `
    <div class="stage-progress-container">
      <div class="header-row">
        <div class="stage-info">
          <span class="active-badge">{{ activeStageLabel() }}</span>
          <span class="step-counter">Stage {{ currentStageNumber() }} / 7</span>
        </div>
        <div class="velocity-meter">
          @if (isLiveActive()) {
            <span class="live-pill active">LIVE</span>
          } @else if (hasRun()) {
            <span class="live-pill paused">PAUSED</span>
          }
          <span class="velocity-val fixed-tks">{{ formattedTokensPerSec() }}</span>
          <span class="velocity-unit">tok/s</span>
          @if (formattedRunTokensPerSec(); as runVal) {
            <span class="run-caption font-mono">(run <span class="fixed-tks">{{ runVal }}</span>)</span>
          }
          <span class="overall-percent">{{ progressPercent() }}%</span>
        </div>
      </div>

      <!-- Segmented Stage Progress Bar -->
      <div class="segmented-bar">
        @for (stage of stages(); track stage.index) {
          <div
            class="stage-segment"
            [ngClass]="stage.status.toLowerCase()"
            [title]="stage.label + ' (' + stage.status + ')'"
            (click)="selectStage(stage)"
          >
            <div class="segment-fill"></div>
          </div>
        }
      </div>

      <!-- Expandable Stage Drawer Details -->
      @if (expandedStage(); as selected) {
        <div class="stage-drawer">
          <div class="drawer-header">
            <strong>Stage Details: {{ selected.label }}</strong>
            <button class="close-btn" (click)="expandedStage.set(null)">✕</button>
          </div>
          <div class="drawer-stats">
            <span>Status: <strong [ngClass]="selected.status.toLowerCase()">{{ selected.status }}</strong></span>
            <span>Duration: {{ selected.durationMs ?? 0 }}ms</span>
            <span>Tokens: {{ selected.tokensReceived ?? 0 }} received</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .stage-progress-container {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.75rem;
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8125rem;
    }

    .stage-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .active-badge {
      font-weight: 700;
      color: var(--color-brand);
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    .step-counter {
      color: var(--text-muted);
      font-size: 0.75rem;
      font-family: var(--font-mono);
    }

    .velocity-meter {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      font-family: var(--font-mono);
      white-space: nowrap;
    }

    .velocity-val {
      font-weight: 700;
      color: var(--color-accent);
      font-size: 0.875rem;
      display: inline-block;
      min-width: 5.5ch;
      width: 5.5ch;
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum";
    }

    .run-caption {
      font-size: 0.6875rem;
      color: var(--text-muted);
      margin-left: 0.25rem;
    }

    .run-caption .fixed-tks {
      min-width: 4.5ch;
      width: 4.5ch;
      text-align: right;
      display: inline-block;
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum";
    }

    .live-pill {
      font-size: 0.625rem;
      font-weight: 700;
      border-radius: 3px;
      padding: 0.1rem 0.4rem;
      margin-right: 0.25rem;
      display: inline-flex;
      align-items: center;
      letter-spacing: 0.04em;
      transition: color 0.4s ease, background-color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
    }

    .live-pill.active {
      color: #10b981;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.25);
      animation: gentle-live-breathe 2.4s ease-in-out infinite;
    }

    .live-pill.paused {
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      animation: none;
    }

    @keyframes gentle-live-breathe {
      0%, 100% {
        opacity: 1;
        box-shadow: 0 0 6px rgba(16, 185, 129, 0.25);
      }
      50% {
        opacity: 0.8;
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.45);
      }
    }

    .velocity-unit {
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .overall-percent {
      margin-left: 0.5rem;
      font-weight: 700;
      color: var(--text-primary);
      font-size: 0.875rem;
    }

    .segmented-bar {
      display: flex;
      gap: 4px;
      height: 8px;
      background: var(--bg-primary);
      border-radius: var(--radius-full);
      overflow: hidden;
      padding: 1px;
    }

    .stage-segment {
      flex: 1;
      height: 100%;
      background: rgba(255, 255, 255, 0.08);
      cursor: pointer;
      transition: all 0.2s ease;
      border-radius: 2px;
    }

    .stage-segment:hover {
      filter: brightness(1.3);
    }

    .stage-segment.success {
      background: var(--status-nominal);
    }

    .stage-segment.running {
      background: var(--color-brand);
      box-shadow: 0 0 8px var(--color-brand-glow);
      animation: pulse 1.5s infinite;
    }

    .stage-segment.failure {
      background: var(--status-danger);
    }

    .stage-drawer {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: var(--bg-surface);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      font-size: 0.75rem;
    }

    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.75rem;
    }

    .drawer-stats {
      display: flex;
      gap: 1rem;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }

    .drawer-stats .success { color: var(--status-nominal); }
    .drawer-stats .running { color: var(--color-brand); }
    .drawer-stats .failure { color: var(--status-danger); }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `],
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
