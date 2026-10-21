import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HistoryMetricsService, type HistoryItem, type ModelLeaderboardEntry } from '../../../services/history-metrics.service';
import { ArenaStateStore, type TaskItem } from '../../../services/arena-state.store';
import { ExplorationControlComponent } from '../../exploration-control/exploration-control.component';
import { TenancyConfigPanelComponent } from '../../tenancy-config-panel/tenancy-config-panel.component';
import { ModelPullModalComponent } from '../../model-pull-modal/model-pull-modal.component';
import { ModelTuningPanelComponent } from '../../model-tuning-panel/model-tuning-panel.component';
import { ModelFleetService } from '../../../services/model-fleet.service';

/**
 * Model Leaderboard & Health Analytics route view:
 * Real-time dynamic win rates, token generation throughput, fallback matrices,
 * high-water mark velocity tracking, role/task distribution, and eviction profiles.
 */
@Component({
  selector: 'app-models-view',
  standalone: true,
  imports: [
    CommonModule,
    ExplorationControlComponent,
    TenancyConfigPanelComponent,
    ModelPullModalComponent,
    ModelTuningPanelComponent
  ],
  templateUrl: './models-view.component.html',
  styleUrl: './models-view.component.css',
})
export class ModelsViewComponent {
  public readonly route = inject(ActivatedRoute);
  public readonly router = inject(Router);
  public readonly store = inject(ArenaStateStore);
  public readonly metricsService = inject(HistoryMetricsService);
  public readonly fleetService = inject(ModelFleetService);

  public readonly selectedModelId = signal<string | null>(null);
  public readonly showPullModal = signal<boolean>(false);
  public readonly showTenancyPanel = signal<boolean>(false);
  public readonly showTuningPanel = signal<boolean>(false);

  public readonly selectedEpoch = signal<string>('current');
  public readonly showEpochModal = signal<boolean>(false);
  public readonly epochNameInput = signal<string>('');
  public readonly epochReasonInput = signal<string>('');
  public readonly epochNotesInput = signal<string>('');
  public readonly isSubmittingEpoch = signal<boolean>(false);

  public openEpochModal(): void {
    const nextEpochId = (this.metricsService.currentEpoch()?.epochId ?? 1) + 1;
    this.epochNameInput.set(`Epoch ${nextEpochId}`);
    this.epochReasonInput.set('Clean slate reset & model recovery');
    this.epochNotesInput.set('');
    this.showEpochModal.set(true);
  }

  public closeEpochModal(): void {
    this.showEpochModal.set(false);
  }

  public async submitNewEpoch(): Promise<void> {
    this.isSubmittingEpoch.set(true);
    try {
      await this.metricsService.advanceEpoch(
        this.epochNameInput(),
        this.epochReasonInput(),
        this.epochNotesInput()
      );
      this.showEpochModal.set(false);
    } finally {
      this.isSubmittingEpoch.set(false);
    }
  }

  public async resetStatsCurrentEpoch(): Promise<void> {
    await this.metricsService.resetStats();
  }

  public onEpochSelected(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedEpoch.set(select.value);
  }

  public onEpochNameInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.epochNameInput.set(target.value);
  }

  public onEpochReasonInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.epochReasonInput.set(target.value);
  }

  public onEpochNotesInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.epochNotesInput.set(target.value);
  }

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const model = params.get('model');
      if (model) {
        this.selectedModelId.set(model);
      } else {
        const active = this.store.telemetry().activeModel;
        if (active && active !== 'None') {
          this.selectedModelId.set(active);
        }
      }
    });
  }

  public selectModel(modelId: string): void {
    if (this.selectedModelId() === modelId) {
      this.selectedModelId.set(null);
      void this.router.navigate([], { queryParams: { model: null }, queryParamsHandling: 'merge' });
    } else {
      this.selectedModelId.set(modelId);
      void this.router.navigate([], { queryParams: { model: modelId }, queryParamsHandling: 'merge' });
    }
  }

  public clearSelection(): void {
    this.selectedModelId.set(null);
    void this.router.navigate([], { queryParams: { model: null }, queryParamsHandling: 'merge' });
  }

  public readonly selectedModelEntry = computed<ModelLeaderboardEntry | null>(() => {
    const modelId = this.selectedModelId();
    if (!modelId) return null;
    return this.metricsService.leaderboard().find((m) => m.modelId === modelId) ?? null;
  });

  public readonly selectedModelTasks = computed<HistoryItem[]>(() => {
    const modelId = this.selectedModelId();
    if (!modelId) return [];
    return this.metricsService.historyItems().filter((h) => h.model === modelId);
  });

  public readonly modelTaskPageSize = 25;
  public readonly modelTaskPage = signal<number>(1);

  public readonly totalModelTaskPages = computed(() => {
    const count = this.selectedModelTasks().length;
    return Math.max(1, Math.ceil(count / this.modelTaskPageSize));
  });

  public readonly paginatedModelTasks = computed(() => {
    const tasks = this.selectedModelTasks();
    const page = Math.min(this.modelTaskPage(), this.totalModelTaskPages());
    const start = (page - 1) * this.modelTaskPageSize;
    return tasks.slice(start, start + this.modelTaskPageSize);
  });

  public setModelTaskPage(page: number): void {
    if (page >= 1 && page <= this.totalModelTaskPages()) {
      this.modelTaskPage.set(page);
    }
  }

  public readonly selectedSuccessCount = computed<number>(() => {
    const entry = this.selectedModelEntry();
    if (entry?.totalSuccess !== undefined) return entry.totalSuccess;
    return this.selectedModelTasks().filter((t) => t.status === 'PASSED').length;
  });

  public readonly selectedFailureCount = computed<number>(() => {
    const entry = this.selectedModelEntry();
    if (entry?.totalFailures !== undefined) return entry.totalFailures;
    return this.selectedModelTasks().filter((t) => t.status === 'FAILED').length;
  });

  public readonly selectedWinRate = computed<number>(() => {
    const entry = this.selectedModelEntry();
    if (entry?.successRate !== undefined) return Math.round(entry.successRate);
    const total = this.selectedModelTasks().length;
    if (total === 0) return 100;
    const passed = this.selectedSuccessCount();
    return Math.round((passed / total) * 100);
  });

  public readonly selectedLatency = computed<number>(() => {
    const entry = this.selectedModelEntry();
    if (entry?.avgLatencyMs !== undefined && entry.avgLatencyMs > 0) return Math.round(entry.avgLatencyMs);
    const tasks = this.selectedModelTasks();
    if (tasks.length === 0) return 2400;
    const sum = tasks.reduce((acc, t) => acc + (t.durationMs || 0), 0);
    return Math.round(sum / tasks.length);
  });

  public readonly selectedModelHwm = computed<number>(() => {
    const modelId = this.selectedModelId();
    if (!modelId) return 0;
    const recorded = this.store.modelHighWaterMarks()[modelId];
    if (recorded && recorded > 0) return recorded;
    const entry = this.selectedModelEntry();
    return entry ? entry.avgTokensPerSec * 1.3 : 0;
  });

  public readonly roleBreakdown = computed<Array<{ role: string; count: number }>>(() => {
    const tasks = this.selectedModelTasks();
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      const r = t.role || 'implementer';
      counts[r] = (counts[r] || 0) + 1;
    }
    return Object.entries(counts).map(([role, count]) => ({ role, count }));
  });

  public readonly priorityBreakdown = computed<Array<{ priority: string; count: number }>>(() => {
    const tasks = this.selectedModelTasks();
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      const p = t.priority || 'P1';
      counts[p] = (counts[p] || 0) + 1;
    }
    return Object.entries(counts).map(([priority, count]) => ({ priority, count }));
  });

  public drillDownTask(item: HistoryItem): void {
    const mapTaskStatus = (s: HistoryItem['status']): TaskItem['status'] => {
      switch (s) {
        case 'PASSED':
          return 'COMPLETED';
        case 'FAILED':
          return 'FAILED';
        case 'REMEDIATED':
        case 'CANCELLED':
        default:
          return 'REMEDIATED';
      }
    };

    const taskItem: TaskItem = {
      id: item.id,
      title: item.title,
      status: mapTaskStatus(item.status),
      priority: (item.priority as any) || 'P1',
      role: item.role || 'implementer',
      modelAssigned: item.model,
      prUrl: item.prUrl,
      logSnippet: item.failureReason ? `Failure Reason: ${item.failureReason}` : undefined,
    };
    void this.store.selectTask(taskItem);
  }

  public formatTks(val: number | null | undefined): string {
    return (Number(val) || 0).toFixed(1);
  }

  /**
   * Formats a millisecond duration into a human-readable string for run rows.
   * Renders as ms for sub-second, seconds for short runs, and m/s for long inference.
   */
  public formatDuration(ms: number | null | undefined): string {
    const v = Number(ms) || 0;
    if (v <= 0) return '--';
    if (v < 1000) return `${v}ms`;
    if (v < 60000) return `${(v / 1000).toFixed(1)}s`;
    const mins = Math.floor(v / 60000);
    const secs = Math.round((v % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  public formatBytes(bytes: number): string {
    return this.fleetService.formatBytes(bytes);
  }

  public async startPullModel(modelTag: string): Promise<void> {
    await this.fleetService.pullModel(modelTag);
  }

  public async deleteModel(modelTag: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete model ${modelTag} from disk?`)) {
      return;
    }
    await this.fleetService.deleteModel(modelTag);
  }

  public async benchmarkModel(modelTag: string): Promise<void> {
    await this.fleetService.benchmarkModel(modelTag);
  }

  public async onUpdateTenancyConfig(partial: Parameters<ModelFleetService['updateConfig']>[0]): Promise<void> {
    await this.fleetService.updateConfig(partial);
  }
}
