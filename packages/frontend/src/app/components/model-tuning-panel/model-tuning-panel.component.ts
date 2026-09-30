import { Component, input, output, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { ModelTuningProfile } from '@cacophony/shared-types';

@Component({
  selector: 'app-model-tuning-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tuning-card cacophony-card">
      <div class="tuning-header">
        <div>
          <h3>Whitebox Model Profile Tuning & Context Optimization</h3>
          <p class="subtitle">Fine-tune num_ctx, num_predict limits, sampling temperatures, and model roles</p>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="auto-tune-btn"
            [disabled]="isAutoTuning()"
            (click)="triggerAutoTune()"
          >
            {{ isAutoTuning() ? 'Tuning Profiles...' : 'Auto-Tune Profiles' }}
          </button>
        </div>
      </div>

      @if (feedbackMessage()) {
        <div class="feedback-banner" [class.success]="isSuccessFeedback()">
          {{ feedbackMessage() }}
        </div>
      }

      <div class="profiles-list">
        @if (profiles().length === 0) {
          <div class="empty-profiles">
            No custom tuning profiles configured. Click 'Auto-Tune Profiles' to synthesize initial profiles.
          </div>
        } @else {
          <div class="profiles-grid">
            @for (profile of profiles(); track profile.id) {
              <div class="profile-item" [class.auto-tuned]="profile.autoTuned">
                <div class="profile-item-header">
                  <div class="model-badge-group">
                    <span class="model-name">{{ profile.modelName }}</span>
                    <span class="role-badge" [class.architect]="profile.role === 'architect'">
                      {{ profile.role }}
                    </span>
                  </div>
                  @if (profile.autoTuned) {
                    <span class="auto-badge">AUTO-TUNED</span>
                  }
                </div>

                <div class="profile-inputs-grid">
                  <div class="input-group">
                    <label>Context Limit (num_ctx)</label>
                    <input
                      type="number"
                      [value]="profile.numCtx"
                      (change)="updateField(profile, 'numCtx', $event)"
                    />
                  </div>

                  <div class="input-group">
                    <label>Generation Limit (num_predict)</label>
                    <input
                      type="number"
                      [value]="profile.numPredict"
                      (change)="updateField(profile, 'numPredict', $event)"
                    />
                  </div>

                  <div class="input-group">
                    <label>Temperature</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.0"
                      max="1.5"
                      [value]="profile.temperature"
                      (change)="updateField(profile, 'temperature', $event)"
                    />
                  </div>

                  <div class="input-group">
                    <label>Top P</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="1.0"
                      [value]="profile.topP"
                      (change)="updateField(profile, 'topP', $event)"
                    />
                  </div>
                </div>

                <div class="profile-actions">
                  <button
                    type="button"
                    class="save-btn"
                    (click)="saveProfile(profile)"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .tuning-card {
      margin-bottom: 1.5rem;
      padding: 1.25rem;
      background: var(--surface-card, #1e1e24);
      border: 1px solid var(--border-color, #2d2d38);
      border-radius: 8px;
    }
    .tuning-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .tuning-header h3 {
      margin: 0 0 0.25rem 0;
      font-size: 1.1rem;
      color: var(--text-primary, #ffffff);
    }
    .subtitle {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-secondary, #94a3b8);
    }
    .auto-tune-btn {
      background: var(--accent-color, #38bdf8);
      color: #0f172a;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.85rem;
      transition: opacity 0.2s;
    }
    .auto-tune-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .feedback-banner {
      padding: 0.6rem 1rem;
      margin-bottom: 1rem;
      border-radius: 6px;
      font-size: 0.85rem;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #fca5a5;
    }
    .feedback-banner.success {
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid #22c55e;
      color: #86efac;
    }
    .profiles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
    }
    .profile-item {
      background: var(--surface-bg, #141419);
      border: 1px solid var(--border-color, #2d2d38);
      border-radius: 6px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .profile-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .model-badge-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .model-name {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-primary, #ffffff);
    }
    .role-badge {
      font-size: 0.7rem;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      background: #334155;
      color: #cbd5e1;
      text-transform: uppercase;
      font-weight: 600;
    }
    .role-badge.architect {
      background: rgba(168, 85, 247, 0.2);
      color: #c084fc;
      border: 1px solid #a855f7;
    }
    .auto-badge {
      font-size: 0.65rem;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      background: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
      border: 1px solid #0284c7;
      font-weight: 700;
    }
    .profile-inputs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .input-group label {
      font-size: 0.75rem;
      color: var(--text-secondary, #94a3b8);
    }
    .input-group input {
      background: var(--surface-card, #1e1e24);
      border: 1px solid var(--border-color, #334155);
      color: var(--text-primary, #ffffff);
      padding: 0.35rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
    }
    .profile-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.25rem;
    }
    .save-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 0.35rem 0.75rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .save-btn:hover {
      background: #1d4ed8;
    }
    .empty-profiles {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary, #94a3b8);
      font-size: 0.9rem;
    }
    @media (max-width: 640px) {
      .profiles-grid {
        grid-template-columns: 1fr;
      }
      .profile-inputs-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ModelTuningPanelComponent {
  public profiles = input<readonly ModelTuningProfile[]>([]);
  public onSaveProfile = output<ModelTuningProfile>();
  public onAutoTune = output<void>();

  public isAutoTuning = signal(false);
  public feedbackMessage = signal<string | null>(null);
  public isSuccessFeedback = signal(true);

  private editedProfiles = new Map<string, Partial<ModelTuningProfile>>();

  public updateField(profile: ModelTuningProfile, field: keyof ModelTuningProfile, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const num = Number(val);
    const existing = this.editedProfiles.get(profile.id) || {};
    this.editedProfiles.set(profile.id, {
      ...existing,
      [field]: isNaN(num) ? val : num
    });
  }

  public saveProfile(profile: ModelTuningProfile): void {
    const edited = this.editedProfiles.get(profile.id) || {};
    const updated: ModelTuningProfile = {
      ...profile,
      ...edited
    };
    this.onSaveProfile.emit(updated);
    this.showFeedback(`Updated tuning profile for ${profile.modelName}`, true);
  }

  public triggerAutoTune(): void {
    this.isAutoTuning.set(true);
    this.onAutoTune.emit();
    setTimeout(() => {
      this.isAutoTuning.set(false);
      this.showFeedback('Profiles auto-tuned successfully', true);
    }, 1200);
  }

  public showFeedback(msg: string, success: boolean): void {
    this.feedbackMessage.set(msg);
    this.isSuccessFeedback.set(success);
    setTimeout(() => {
      if (this.feedbackMessage() === msg) {
        this.feedbackMessage.set(null);
      }
    }, 4000);
  }
}
