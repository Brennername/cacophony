import { Component, input, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ExecutionSafetyMode = 'plan' | 'build' | 'auto';

/**
 * Responsive segmented control for toggling between Plan, Build, and Auto execution safety modes.
 */
@Component({
  selector: 'app-execution-mode-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mode-selector-container" role="radiogroup" aria-label="Execution Safety Mode">
      <div
        class="mode-option"
        [class.selected]="selectedMode() === 'plan'"
        (click)="selectMode('plan')"
        role="radio"
        [attr.aria-checked]="selectedMode() === 'plan'"
        tabindex="0"
        (keydown.enter)="selectMode('plan')"
      >
        <span class="mode-badge">Plan</span>
        <span class="mode-desc">Read-only, no disk edits</span>
      </div>

      <div
        class="mode-option"
        [class.selected]="selectedMode() === 'build'"
        (click)="selectMode('build')"
        role="radio"
        [attr.aria-checked]="selectedMode() === 'build'"
        tabindex="0"
        (keydown.enter)="selectMode('build')"
      >
        <span class="mode-badge">Build</span>
        <span class="mode-desc">Apply edits & tests (confirm commit)</span>
      </div>

      <div
        class="mode-option"
        [class.selected]="selectedMode() === 'auto'"
        (click)="selectMode('auto')"
        role="radio"
        [attr.aria-checked]="selectedMode() === 'auto'"
        tabindex="0"
        (keydown.enter)="selectMode('auto')"
      >
        <span class="mode-badge">Auto</span>
        <span class="mode-desc">Autonomous closed loop</span>
      </div>
    </div>
  `,
  styles: [`
    .mode-selector-container {
      display: flex;
      gap: 0.5rem;
      background: var(--bg-surface, #1e1e24);
      padding: 0.35rem;
      border-radius: 6px;
      border: 1px solid var(--border-color, #2d2d38);
      overflow-x: auto;
    }
    .mode-option {
      flex: 1;
      min-width: 140px;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      padding: 0.4rem 0.6rem;
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
      background: transparent;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .mode-option:hover {
      background: var(--bg-card, #262633);
    }
    .mode-option.selected {
      background: var(--bg-card, #0f172a);
      border-color: var(--color-primary, #38bdf8);
    }
    .mode-badge {
      font-weight: 700;
      font-size: 0.85rem;
      color: var(--text-primary, #f8fafc);
    }
    .mode-option.selected .mode-badge {
      color: var(--color-primary, #38bdf8);
    }
    .mode-desc {
      font-size: 0.72rem;
      color: var(--text-muted, #94a3b8);
      line-height: 1.2;
    }
  `]
})
export class ExecutionModeSelectorComponent {
  public readonly selectedMode = model<ExecutionSafetyMode>('build');
  public readonly modeChanged = output<ExecutionSafetyMode>();

  public selectMode(mode: ExecutionSafetyMode): void {
    this.selectedMode.set(mode);
    this.modeChanged.emit(mode);
  }
}
