import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskHistoryComponent } from '../task-history/task-history.component';
import { CheckpointTimelineComponent } from '../checkpoint-timeline/checkpoint-timeline.component';
import { RepoStateService } from '../../services/repo-state.service';

/**
 * Task History route view:
 * Audited execution runs, failure cause taxonomy, diff comparisons, Gitea PR links,
 * and Git micro-checkpoint timeline.
 */
@Component({
  selector: 'app-history-view',
  standalone: true,
  imports: [CommonModule, TaskHistoryComponent, CheckpointTimelineComponent],
  template: `
    <div class="view-container">
      <div class="view-header">
        <h1>Task Execution History & Audit Log</h1>
        <p class="subtitle">Postmortem reviews, failure categorizations, and git undo checkpoints</p>
      </div>

      <div class="history-grid">
        <section class="grid-card-wrapper full-width">
          <app-task-history />
        </section>

        <section class="grid-card-wrapper full-width">
          <app-checkpoint-timeline [checkpoints]="repoService.checkpoints()" />
        </section>
      </div>
    </div>
  `,
  styles: [`
    .view-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .view-header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .history-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }

    .grid-card-wrapper {
      display: flex;
      flex-direction: column;
    }

    .grid-card-wrapper > * {
      flex: 1;
    }
  `],
})
export class HistoryViewComponent {
  public readonly repoService = inject(RepoStateService);
}
