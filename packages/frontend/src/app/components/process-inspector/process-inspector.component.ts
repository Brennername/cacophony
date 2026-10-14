import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArenaStateStore } from '../../services/arena-state.store';

/**
 * Test Runner and Process Inspector displaying non-model spawned operations
 * (unit tests, linters, git worktree operations) with duration, exit codes, and status.
 */
@Component({
  selector: 'app-process-inspector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './process-inspector.component.html',
  styleUrl: './process-inspector.component.css',
})
export class ProcessInspectorComponent {
  private readonly store = inject(ArenaStateStore);
  public readonly processes = this.store.processes;
}
