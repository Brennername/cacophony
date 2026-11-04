import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VaultService } from '../../../services/vault.service';
import { FrontierUsageCardComponent } from '../../shared/frontier-usage-card/frontier-usage-card.component';
import type { FrontierProviderType, VaultKeyDescriptor } from '@cacophony/shared-types';

interface ProviderDefinition {
  readonly id: FrontierProviderType;
  readonly name: string;
  readonly placeholder: string;
  readonly docUrl: string;
}

/**
 * VaultViewComponent
 *
 * Secure management portal for encrypted Frontier and Cloud LLM API keys.
 * Enforces AES-256-GCM storage, PBKDF2 key derivation, zero-leak masked previews,
 * and tracks rolling 5-hour burst tokens and weekly budget ceilings.
 */
@Component({
  selector: 'app-vault-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FrontierUsageCardComponent],
  templateUrl: './vault-view.component.html',
  styleUrls: ['./vault-view.component.css'],
})
export class VaultViewComponent implements OnInit {
  public readonly vaultService = inject(VaultService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  public readonly supportedProviders: readonly ProviderDefinition[] = [
    {
      id: 'anthropic',
      name: 'Anthropic (Claude 3.5 Sonnet / Haiku)',
      placeholder: 'sk-ant-api03-...',
      docUrl: 'https://console.anthropic.com/settings/keys',
    },
    {
      id: 'openai',
      name: 'OpenAI (GPT-4o / o1 / o3)',
      placeholder: 'sk-proj-...',
      docUrl: 'https://platform.openai.com/api-keys',
    },
    {
      id: 'deepseek',
      name: 'DeepSeek Platform (V3 / R1 Cloud)',
      placeholder: 'sk-...',
      docUrl: 'https://platform.deepseek.com/api_keys',
    },
    {
      id: 'gemini',
      name: 'Google Gemini (1.5 Pro / Flash)',
      placeholder: 'AIzaSy...',
      docUrl: 'https://aistudio.google.com/app/apikey',
    },
    {
      id: 'groq',
      name: 'Groq Cloud (Llama 3.3 / Qwen)',
      placeholder: 'gsk_...',
      docUrl: 'https://console.groq.com/keys',
    },
    {
      id: 'mistral',
      name: 'Mistral AI (Codestral / Large)',
      placeholder: '...',
      docUrl: 'https://console.mistral.ai/api-keys',
    },
  ];

  public readonly notice = signal<string | null>(null);
  public readonly returnUrl = signal<string | null>(null);

  // Key form state
  public readonly formProvider = signal<FrontierProviderType>('anthropic');
  public readonly rawKeyInput = signal<string>('');
  public readonly isSubmitting = signal<boolean>(false);
  public readonly feedbackSuccess = signal<string | null>(null);
  public readonly feedbackError = signal<string | null>(null);

  // Limits form state
  public readonly weeklyCeilingInput = signal<number>(15.0);
  public readonly fiveHourTokenLimitInput = signal<number>(250000);
  public readonly limitsFeedback = signal<string | null>(null);

  public readonly totalKeysConfigured = computed(() => this.vaultService.keys().length);

  public ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const providerParam = qp.get('provider') as FrontierProviderType | null;
    const returnUrlParam = qp.get('returnUrl');
    const noticeParam = qp.get('notice');

    if (providerParam && this.supportedProviders.some((p) => p.id === providerParam)) {
      this.formProvider.set(providerParam);
    }
    if (returnUrlParam) {
      this.returnUrl.set(returnUrlParam);
    }
    if (noticeParam) {
      this.notice.set(noticeParam);
    }

    const currentLimits = this.vaultService.limits();
    this.weeklyCeilingInput.set(currentLimits.weeklyBudgetCeilingUsd);
    this.fiveHourTokenLimitInput.set(currentLimits.fiveHourTokenLimit);
  }

  /**
   * Checks whether a specific provider has a verified key configured.
   */
  public getKeyDescriptor(provider: FrontierProviderType): VaultKeyDescriptor | undefined {
    return this.vaultService.keys().find((k) => k.provider === provider);
  }

  /**
   * Pre-fills the key entry form for a specific provider.
   */
  public selectProviderForEdit(provider: FrontierProviderType): void {
    this.formProvider.set(provider);
    this.rawKeyInput.set('');
    this.feedbackSuccess.set(null);
    this.feedbackError.set(null);
    // Smooth scroll to entry form
    const formElem = document.getElementById('vault-key-form');
    if (formElem && typeof formElem.scrollIntoView === 'function') {
      formElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Submits encrypted key to POST /api/vault/keys.
   */
  public async submitKey(): Promise<void> {
    const key = this.rawKeyInput().trim();
    if (!key) {
      this.feedbackError.set('Please provide a valid API key string.');
      return;
    }

    this.isSubmitting.set(true);
    this.feedbackError.set(null);
    this.feedbackSuccess.set(null);

    const success = await this.vaultService.saveKey(this.formProvider(), key);
    this.isSubmitting.set(false);

    if (success) {
      this.rawKeyInput.set('');
      this.feedbackSuccess.set(
        `API key for ${this.formProvider().toUpperCase()} encrypted and saved successfully.`
      );

      // If user came via redirect, allow seamless return
      if (this.returnUrl()) {
        setTimeout(() => {
          if (this.returnUrl()) {
            void this.router.navigateByUrl(this.returnUrl()!);
          }
        }, 1500);
      }
    } else {
      this.feedbackError.set(this.vaultService.error() || 'Failed to save credential.');
    }
  }

  /**
   * Revokes an existing provider credential.
   */
  public async revokeKey(provider: FrontierProviderType): Promise<void> {
    if (!confirm(`Revoke encrypted credential for ${provider.toUpperCase()}? Tasks requiring this provider will fallback to local models.`)) {
      return;
    }

    this.isSubmitting.set(true);
    const success = await this.vaultService.deleteKey(provider);
    this.isSubmitting.set(false);

    if (success) {
      this.feedbackSuccess.set(`Credential for ${provider.toUpperCase()} revoked.`);
    } else {
      this.feedbackError.set(this.vaultService.error() || 'Failed to revoke credential.');
    }
  }

  /**
   * Updates 5-hour token limits and weekly budget ceiling.
   */
  public async saveLimits(): Promise<void> {
    this.limitsFeedback.set(null);
    const success = await this.vaultService.updateLimits({
      weeklyBudgetCeilingUsd: Number(this.weeklyCeilingInput()),
      fiveHourTokenLimit: Number(this.fiveHourTokenLimitInput()),
    });

    if (success) {
      this.limitsFeedback.set('Spending quotas updated successfully.');
      setTimeout(() => this.limitsFeedback.set(null), 3000);
    } else {
      this.limitsFeedback.set('Failed to update limits.');
    }
  }
}
