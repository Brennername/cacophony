import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcessInspectorComponent } from '../process-inspector/process-inspector.component';
import { ArenaStateStore } from '../../services/arena-state.store';

/**
 * Process Inspector route view:
 * Real-time monitoring of spawned non-model test runners, linters, git worktrees, and shell audits.
 */
@Component({
  selector: 'app-processes-view',
  standalone: true,
  imports: [CommonModule, ProcessInspectorComponent],
  templateUrl: './processes-view.component.html',
  styleUrl: './processes-view.component.css',
})
export class ProcessesViewComponent {
  public readonly store = inject(ArenaStateStore);
}
