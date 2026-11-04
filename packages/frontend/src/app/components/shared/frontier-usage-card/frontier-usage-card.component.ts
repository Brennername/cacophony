import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { VaultUsageSummary, VaultLimitsConfig } from '@cacophony/shared-types';

/**
 * FrontierUsageCardComponent
 *
 * Visual usage card displaying rolling 5-hour burst tokens and 7-day spending quota
 * with color-coded safety thresholds (<70% green, 70-90% amber, >=90% red).
 */
@Component({
  selector: 'app-frontier-usage-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './frontier-usage-card.component.html',
  styleUrls: ['./frontier-usage-card.component.css'],
})
export class FrontierUsageCardComponent {
  public readonly summary = input<VaultUsageSummary | null>(null);
  public readonly limits = input<VaultLimitsConfig | null>(null);
  public readonly title = input<string>('Frontier Usage & Quotas');

  /**
   * Returns CSS class based on usage percentage.
   */
  public getStatusClass(percent: number): string {
    if (percent >= 90) return 'status-danger';
    if (percent >= 70) return 'status-warning';
    return 'status-optimal';
  }

  /**
   * Helper formatting USD amounts.
   */
  public formatUsd(amount: number): string {
    return `$${(amount || 0).toFixed(2)}`;
  }

  /**
   * Helper formatting token numbers with K/M suffixes.
   */
  public formatTokens(tokens: number): string {
    if (!tokens || tokens <= 0) return '0';
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
    return String(tokens);
  }
}
