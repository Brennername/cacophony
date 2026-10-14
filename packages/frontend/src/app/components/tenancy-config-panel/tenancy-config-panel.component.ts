import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { ModelManagementConfig } from '@cacophony/shared-types';

/**
 * TenancyConfigPanelComponent
 *
 * Provides granular management of multi-tenant model guardrails:
 * - Toggle managedModelsEnabled and autoEvictionEnabled.
 * - Interactive chip tag editor for protectedModels whitelist.
 * - Max disk quota configuration with storage headroom monitoring.
 */
@Component({
  selector: 'app-tenancy-config-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenancy-config-panel.component.html',
  styleUrl: './tenancy-config-panel.component.css',
})
export class TenancyConfigPanelComponent {
  public readonly config = input.required<ModelManagementConfig>();
  public readonly onUpdateConfig = output<Partial<ModelManagementConfig>>();

  public newProtectedTag = '';

  public toggleManagedModels(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.onUpdateConfig.emit({ managedModelsEnabled: checked });
  }

  public toggleAutoEvict(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.onUpdateConfig.emit({ autoEvictionEnabled: checked });
  }

  public removeProtectedModel(tag: string): void {
    const nextList = this.config().protectedModels.filter((t) => t !== tag);
    this.onUpdateConfig.emit({ protectedModels: nextList });
  }

  public addProtectedModel(): void {
    const trimmed = this.newProtectedTag.trim();
    if (trimmed && !this.config().protectedModels.includes(trimmed)) {
      const nextList = [...this.config().protectedModels, trimmed];
      this.onUpdateConfig.emit({ protectedModels: nextList });
      this.newProtectedTag = '';
    }
  }

  public onQuotaChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    if (!isNaN(val) && val > 0) {
      this.onUpdateConfig.emit({ maxDiskStorageGb: val });
    }
  }
}
