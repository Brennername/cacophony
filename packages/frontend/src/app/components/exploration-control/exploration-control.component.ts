import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

export interface BanditArmUi {
  readonly armId: string;
  readonly modelId: string;
  readonly role: string;
  readonly winRatePct: number;
  readonly trialsCount: number;
  readonly alpha: number;
  readonly beta: number;
  readonly tokensPerSec: number;
  readonly vramMb: number;
}

@Component({
  selector: 'app-exploration-control',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="exploration-card cacophony-card">
      <div class="card-header">
        <div>
          <h3>Stochastic Exploration & Multi-Armed Bandit</h3>
          <p class="subtitle">Epsilon-Greedy, UCB-1, and Thompson Sampling dispatch telemetry</p>
        </div>
        <div class="policy-pills">
          <button
            type="button"
            class="pill-btn"
            [class.active]="activePolicy() === 'epsilon_greedy'"
            (click)="setPolicy('epsilon_greedy')"
          >
            Epsilon-Greedy
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="activePolicy() === 'ucb1'"
            (click)="setPolicy('ucb1')"
          >
            UCB-1
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="activePolicy() === 'thompson_sampling'"
            (click)="setPolicy('thompson_sampling')"
          >
            Thompson Sampling
          </button>
        </div>
      </div>

      <div class="slider-box">
        <div class="slider-labels">
          <span>Exploration Rate (ε): {{ (epsilon() * 100).toFixed(0) }}%</span>
          <span class="text-muted">Exploit: {{ ((1 - epsilon()) * 100).toFixed(0) }}%</span>
        </div>
        <input
          type="range"
          min="0.01"
          max="0.50"
          step="0.01"
          [value]="epsilon()"
          (input)="onEpsilonChange($event)"
          class="slider-input"
        />
      </div>

      <div class="arms-grid">
        @for (arm of arms(); track arm.armId) {
          <div class="arm-item">
            <div class="arm-top">
              <span class="arm-name">{{ arm.modelId }}</span>
              <span class="arm-role-badge">{{ arm.role }}</span>
            </div>

            <div class="confidence-bar-wrapper">
              <div class="confidence-labels">
                <span>Posterior Win Rate</span>
                <span>{{ arm.winRatePct }}% ({{ arm.trialsCount }} trials)</span>
              </div>
              <div class="track">
                <div class="fill" [style.width.%]="arm.winRatePct"></div>
              </div>
            </div>

            <div class="beta-params">
              <span>Beta Prior: α={{ arm.alpha }}, β={{ arm.beta }}</span>
              <span><span class="fixed-tks">{{ formatTks(arm.tokensPerSec) }}</span> tok/s</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .exploration-card {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1.25rem;
      border-radius: 8px;
      border: 1px solid var(--border-color, #2a2e39);
      background: var(--card-bg, #1a1d24);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    h3 {
      margin: 0;
      font-size: 1.1rem;
      color: var(--text-primary, #e2e8f0);
    }

    .subtitle {
      margin: 0.25rem 0 0;
      font-size: 0.825rem;
      color: var(--text-secondary, #94a3b8);
    }

    .policy-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .pill-btn {
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      border: 1px solid var(--border-color, #334155);
      background: var(--bg-surface, #1e293b);
      color: var(--text-secondary, #94a3b8);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .pill-btn.active {
      background: var(--primary, #3b82f6);
      color: #fff;
      border-color: var(--primary, #3b82f6);
    }

    .slider-box {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.2);
      padding: 0.75rem 1rem;
      border-radius: 6px;
    }

    .slider-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: var(--text-primary, #e2e8f0);
    }

    .slider-input {
      width: 100%;
      accent-color: var(--primary, #3b82f6);
    }

    .arms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .arm-item {
      padding: 0.85rem;
      border-radius: 6px;
      background: var(--bg-surface, #1e293b);
      border: 1px solid var(--border-color, #334155);
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .arm-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .arm-name {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary, #e2e8f0);
    }

    .arm-role-badge {
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
    }

    .confidence-bar-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .confidence-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-secondary, #94a3b8);
    }

    .track {
      height: 6px;
      background: #0f172a;
      border-radius: 3px;
      overflow: hidden;
    }

    .fill {
      height: 100%;
      background: #10b981;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .beta-params {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      color: var(--text-secondary, #94a3b8);
      font-family: monospace;
      white-space: nowrap;
    }

    .beta-params .fixed-tks {
      min-width: 4.5ch;
      width: 4.5ch;
      text-align: right;
      display: inline-block;
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum";
    }
  `],
})
export class ExplorationControlComponent implements OnInit {
  public readonly epsilon = signal<number>(0.15);
  public readonly activePolicy = signal<'epsilon_greedy' | 'ucb1' | 'thompson_sampling'>('epsilon_greedy');

  public readonly arms = signal<BanditArmUi[]>([]);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchArmsAndPolicy();
  }

  private async fetchArmsAndPolicy(): Promise<void> {
    try {
      const response = await this.http.get<{ arms?: BanditArmUi[]; policy?: 'epsilon_greedy' | 'ucb1' | 'thompson_sampling' }>('/api/bandit/arms').toPromise();
      if (response) {
        if (response.arms) {
          this.arms.set(response.arms);
        }
        if (response.policy) {
          this.activePolicy.set(response.policy);
        }
      }
    } catch (error) {
      console.error('Failed to fetch arms and policy:', error);
    }
  }

  public setPolicy(policy: 'epsilon_greedy' | 'ucb1' | 'thompson_sampling'): void {
    this.activePolicy.set(policy);
  }

  public onEpsilonChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.epsilon.set(val);
  }

  public formatTks(val: number | null | undefined): string {
    return (Number(val) || 0).toFixed(1);
  }
}