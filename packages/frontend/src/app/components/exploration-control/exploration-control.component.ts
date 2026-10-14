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
  templateUrl: './exploration-control.component.html',
  styleUrl: './exploration-control.component.css',
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
    this.dispatchPolicyUpdate(policy);
  }

  public onEpsilonChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.epsilon.set(val);
  }

  public formatTks(val: number | null | undefined): string {
    return (Number(val) || 0).toFixed(1);
  }

  private async dispatchPolicyUpdate(policy: 'epsilon_greedy' | 'ucb1' | 'thompson_sampling'): Promise<void> {
    try {
      await this.http.put('/api/bandit/policy', { policy }).toPromise();
      console.log('Policy updated successfully:', policy);
    } catch (error) {
      console.error('Failed to update policy:', error);
    }
  }
}