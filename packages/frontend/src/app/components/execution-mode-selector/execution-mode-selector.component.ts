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
  templateUrl: './execution-mode-selector.component.html',
  styleUrl: './execution-mode-selector.component.css',
})
export class ExecutionModeSelectorComponent {
  public readonly selectedMode = model<ExecutionSafetyMode>('build');
  public readonly modeChanged = output<ExecutionSafetyMode>();

  public selectMode(mode: ExecutionSafetyMode): void {
    this.selectedMode.set(mode);
    this.modeChanged.emit(mode);
  }
}
