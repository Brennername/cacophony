import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ExecutionSafetyMode = 'plan' | 'build' | 'auto';

@Component({
  selector: 'app-execution-mode-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './execution-mode-selector.component.html',
  styleUrls: ['./execution-mode-selector.component.css'],
})
export class ExecutionModeSelectorComponent {
  /**
   * The currently selected execution mode. Defaults to 'build'.
   */
  selectedMode = signal<ExecutionSafetyMode>('build');

  /**
   * Emits the new selected execution mode when it changes.
   */
  modeChanged = output<ExecutionSafetyMode>();

  /**
   * Selects a new execution mode and emits an event with the new mode.
   * @param mode The new execution mode to select.
   */
  selectMode(mode: ExecutionSafetyMode): void {
    this.selectedMode.set(mode);
    this.modeChanged.emit(mode);
  }
}
