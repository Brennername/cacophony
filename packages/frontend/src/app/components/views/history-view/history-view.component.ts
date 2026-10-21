import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskHistoryComponent } from '../../task-history/task-history.component';
import { CheckpointTimelineComponent } from '../../checkpoint-timeline/checkpoint-timeline.component';
import { TrendChartComponent } from '../../trend-chart/trend-chart.component';
import { RepoStateService } from '../../../services/repo-state.service';

/**
 * Task History route view:
 * Audited execution runs, failure cause taxonomy, diff comparisons, Gitea PR links,
 * AOC historical trend charts, and Git micro-checkpoint timeline.
 */
@Component({
  selector: 'app-history-view',
  standalone: true,
  imports: [CommonModule, TaskHistoryComponent, CheckpointTimelineComponent, TrendChartComponent],
  templateUrl: './history-view.component.html',
  styleUrl: './history-view.component.css',
})
export class HistoryViewComponent {
  public readonly repoService = inject(RepoStateService);
}
