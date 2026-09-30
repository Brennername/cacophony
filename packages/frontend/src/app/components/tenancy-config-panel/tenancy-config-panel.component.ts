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
  template: `
    <div class="tenancy-card cacophony-card">
      <div class="tenancy-header">
        <div>
          <h3>Multi-Tenant Model Guardrails & Tenancy Rules</h3>
          <p class="subtitle">Protect external models (OpenWebUI/Cursor) and govern automated evictions</p>
        </div>
        <div class="header-badges">
          <span class="badge" [class.badge-active]="config().managedModelsEnabled">
            {{ config().managedModelsEnabled ? 'MANAGED' : 'UNMANAGED' }}
          </span>
          <span class="badge" [class.badge-active]="config().autoEvictionEnabled">
            {{ config().autoEvictionEnabled ? 'AUTO-EVICT ON' : 'AUTO-EVICT OFF' }}
          </span>
        </div>
      </div>

      <div class="tenancy-body">
        <!-- Master Toggles -->
        <div class="toggles-grid">
          <label class="toggle-control">
            <input
              type="checkbox"
              [checked]="config().managedModelsEnabled"
              (change)="toggleManagedModels($event)"
            />
            <span class="toggle-label">
              <strong>Automated Model Management</strong>
              <small>Allow Cacophony to control model pulls and hardware adaptation</small>
            </span>
          </label>

          <label class="toggle-control">
            <input
              type="checkbox"
              [checked]="config().autoEvictionEnabled"
              [disabled]="!config().managedModelsEnabled"
              (change)="toggleAutoEvict($event)"
            />
            <span class="toggle-label">
              <strong>Automated Eviction on Failure</strong>
              <small>Evict models exceeding consecutive failure limit (except protected)</small>
            </span>
          </label>
        </div>

        <!-- Protected Whitelist Tag Editor -->
        <div class="whitelist-section">
          <label class="section-label">
            Protected Model Whitelist (Never Automatically Evicted)
          </label>
          <div class="chips-container">
            @for (pattern of config().protectedModels; track pattern) {
              <span class="chip">
                <span class="chip-text font-mono">{{ pattern }}</span>
                <button
                  type="button"
                  class="chip-remove-btn"
                  (click)="removeProtectedModel(pattern)"
                  title="Remove protection"
                >✕</button>
              </span>
            }
          </div>
          <div class="add-chip-row">
            <input
              type="text"
              class="chip-input font-mono"
              placeholder="Add tag or wildcard (e.g. deepseek-r1:8b-4k or custom-*)"
              [(ngModel)]="newProtectedTag"
              (keydown.enter)="addProtectedModel()"
            />
            <button class="add-chip-btn" (click)="addProtectedModel()">+ Protect Model</button>
          </div>
        </div>

        <!-- Quota & Storage Gauge -->
        <div class="quota-section">
          <div class="quota-row">
            <span class="section-label">Storage Headroom Cap</span>
            <span class="quota-val tabular">{{ config().maxDiskStorageGb }} GB</span>
          </div>
          <input
            type="range"
            min="10"
            max="200"
            step="5"
            class="range-slider"
            [value]="config().maxDiskStorageGb"
            (input)="onQuotaChange($event)"
          />
          <div class="slider-ticks">
            <span>10 GB</span>
            <span>50 GB (Default)</span>
            <span>100 GB</span>
            <span>200 GB</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenancy-card {
      background: var(--bg-surface, #161b22);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: var(--radius-lg, 12px);
      padding: 16px 20px;
      margin-bottom: 20px;
    }

    .tenancy-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    .tenancy-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary, #e6edf3);
    }

    .subtitle {
      margin: 4px 0 0;
      font-size: 0.8rem;
      color: var(--text-muted, #8b949e);
    }

    .header-badges {
      display: flex;
      gap: 8px;
    }

    .badge {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-muted, #8b949e);
    }

    .badge-active {
      background: rgba(46, 160, 67, 0.15);
      color: var(--color-success, #3fb950);
      border: 1px solid rgba(46, 160, 67, 0.3);
    }

    .tenancy-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .toggles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
    }

    .toggle-control {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
      background: var(--bg-surface-elevated, #21262d);
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    }

    .toggle-control input[type="checkbox"] {
      margin-top: 3px;
      cursor: pointer;
    }

    .toggle-label {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .toggle-label strong {
      font-size: 0.85rem;
      color: var(--text-primary, #e6edf3);
    }

    .toggle-label small {
      font-size: 0.75rem;
      color: var(--text-muted, #8b949e);
    }

    .section-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted, #8b949e);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(56, 139, 253, 0.12);
      border: 1px solid rgba(56, 139, 253, 0.3);
      padding: 4px 10px;
      border-radius: 14px;
      font-size: 0.75rem;
      color: var(--color-brand, #58a6ff);
    }

    .chip-remove-btn {
      background: transparent;
      border: none;
      color: var(--color-brand, #58a6ff);
      cursor: pointer;
      padding: 0;
      font-size: 0.75rem;
    }

    .chip-remove-btn:hover { color: #f85149; }

    .add-chip-row {
      display: flex;
      gap: 8px;
    }

    .chip-input {
      flex: 1;
      max-width: 400px;
      background: var(--bg-surface-elevated, #0d1117);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 0.8rem;
      color: var(--text-primary, #e6edf3);
    }

    .chip-input:focus {
      outline: none;
      border-color: var(--color-brand, #388bfd);
    }

    .add-chip-btn {
      background: var(--bg-surface-elevated, #21262d);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
      color: var(--text-primary, #e6edf3);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      cursor: pointer;
    }

    .add-chip-btn:hover { background: rgba(255, 255, 255, 0.08); }

    .quota-section {
      background: var(--bg-surface-elevated, #0d1117);
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .quota-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .quota-val {
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--color-brand, #58a6ff);
    }

    .range-slider {
      width: 100%;
      accent-color: var(--color-brand, #1f6feb);
      cursor: pointer;
    }

    .slider-ticks {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      color: var(--text-muted, #6e7681);
      margin-top: 4px;
    }
  `]
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
