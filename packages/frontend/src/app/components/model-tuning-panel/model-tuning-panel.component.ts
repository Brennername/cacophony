import { Component, input, output, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { ModelTuningProfile } from '@cacophony/shared-types';

@Component({
  selector: 'app-model-tuning-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './model-tuning-panel.component.html',
  styleUrl: './model-tuning-panel.component.css',
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
