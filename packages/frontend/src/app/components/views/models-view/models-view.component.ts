import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HistoryMetricsService, type HistoryItem, type ModelLeaderboardEntry } from '../../../services/history-metrics.service';
import { ArenaStateStore, type TaskItem } from '../../../services/arena-state.store';
import { TenancyConfigPanelComponent } from '../../tenancy-config-panel/tenancy-config-panel.component';
import { ModelPullModalComponent } from '../../model-pull-modal/model-pull-modal.component';
import { ModelTuningPanelComponent } from '../../model-tuning-panel/model-tuning-panel.component';
import { ModelFleetService } from '../../../services/model-fleet.service';
import { VaultService } from '../../../services/vault.service';
import type { OllamaInstalledModel, VerifiableModelEntry, ModelLifecycleRole } from '@cacophony/shared-types';

/**
 * ModelsViewComponent
 *
 * Condensed Master-Detail Workspace for AI Model Fleet Management:
 * - Master Column: Dual action entrypoints (+ Pull Model top, + Add Model bottom),
 *   segmented into Roster, Bullpen, and Breakdown.
 * - Detail Pane: Deep specification inspector (context window, VRAM footprint,
 *   win rate, telemetry, and vault credentials status).
 * - Mobile: Collapsible navigation drawer with directional arrow toggles (< and >).
 */
@Component({
  selector: 'app-models-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TenancyConfigPanelComponent,
    ModelPullModalComponent,
    ModelTuningPanelComponent,
  ],
  templateUrl: './models-view.component.html',
  styleUrl: './models-view.component.css',
})
export class ModelsViewComponent implements OnInit {
  public readonly route = inject(ActivatedRoute);
  public readonly router = inject(Router);
  public readonly store = inject(ArenaStateStore);
  public readonly metricsService = inject(HistoryMetricsService);
  public readonly fleetService = inject(ModelFleetService);
  public readonly vaultService = inject(VaultService);

  public readonly selectedModelId = signal<string | null>(null);
  public readonly showPullModal = signal<boolean>(false);
  public readonly showTenancyPanel = signal<boolean>(false);
  public readonly showTuningPanel = signal<boolean>(false);
  public readonly showAddModelModal = signal<boolean>(false);

  // Mobile drawer state: on mobile (< 768px), controls whether master list is visible
  public readonly mobileDrawerOpen = signal<boolean>(false);

  // Epoch state
  public readonly selectedEpoch = signal<string>('current');
  public readonly showEpochModal = signal<boolean>(false);
  public readonly epochNameInput = signal<string>('');
  public readonly epochReasonInput = signal<string>('');
  public readonly epochNotesInput = signal<string>('');
  public readonly isSubmittingEpoch = signal<boolean>(false);

  // Add Model Modal Form state
  public readonly addModelTag = signal<string>('');
  public readonly addModelProvider = signal<string>('ollama');
  public readonly addModelParamSize = signal<number>(7);
  public readonly addModelContextWindow = signal<number>(16384);
  public readonly addModelTier = signal<string>('ROSTER');
  public readonly addModelRoles = signal<string[]>(['implementer']);
  public readonly addModelFeedback = signal<string | null>(null);
  public readonly isSubmittingAddModel = signal<boolean>(false);

  public ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const model = params.get('model');
      if (model) {
        this.selectedModelId.set(model);
      } else {
        const first = this.rosterModels()[0] || this.bullpenModels()[0];
        if (first) {
          this.selectedModelId.set(first.name);
        }
      }
    });
  }

  /**
   * Models classified as active Roster (installed, protected, warm, or high pass rate).
   */
  public readonly rosterModels = computed<OllamaInstalledModel[]>(() => {
    const installed = this.fleetService.installedModels();
    if (installed.length === 0) return [];
    return installed.filter(
      (m) => m.isProtected || m.isLoadedInVram || (m.details?.parameterSize && m.details.parameterSize.includes('7B'))
    );
  });

  /**
   * Models classified as Bullpen (candidates or staging pool).
   */
  public readonly bullpenModels = computed<OllamaInstalledModel[]>(() => {
    const installed = this.fleetService.installedModels();
    const rosterNames = new Set(this.rosterModels().map((m) => m.name));
    return installed.filter((m) => !rosterNames.has(m.name));
  });

  /**
   * Fleet breakdown aggregates.
   */
  public readonly fleetBreakdown = computed(() => {
    const installed = this.fleetService.installedModels();
    const totalBytes = installed.reduce((acc, m) => acc + (m.sizeBytes || 0), 0);
    const warmCount = installed.filter((m) => m.isLoadedInVram).length;
    const protectedCount = this.fleetService.protectedCount();
    const passRate = this.metricsService.rollingSuccessRate();

    return {
      totalModels: installed.length,
      totalStorageFormatted: this.fleetService.formatBytes(totalBytes),
      warmCount,
      protectedCount,
      passRate,
    };
  });

  /**
   * Selected model specification record from installed list.
   */
  public readonly selectedInstalledModel = computed<OllamaInstalledModel | null>(() => {
    const id = this.selectedModelId();
    if (!id) return null;
    return this.fleetService.installedModels().find((m) => m.name === id) || null;
  });

  /**
   * Selected model specification record from catalog.
   */
  public readonly selectedCatalogEntry = computed<VerifiableModelEntry | null>(() => {
    const id = this.selectedModelId();
    if (!id) return null;
    return this.fleetService.catalog().find((c) => c.tag === id || id.startsWith(c.tag)) || null;
  });

  /**
   * Infers whether the selected model is a frontier cloud model without an active key.
   */
  public readonly selectedModelKeyMissing = computed<boolean>(() => {
    const catalog = this.selectedCatalogEntry();
    if (catalog && catalog.isFrontier) {
      return !this.vaultService.hasKey(catalog.provider);
    }
    const id = (this.selectedModelId() || '').toLowerCase();
    if (id.includes('claude') && !this.vaultService.hasKey('anthropic')) return true;
    if ((id.includes('gpt-4') || id.includes('o1') || id.includes('o3')) && !this.vaultService.hasKey('openai')) return true;
    if (id.includes('deepseek') && id.includes('cloud') && !this.vaultService.hasKey('deepseek')) return true;
    if (id.includes('gemini') && !this.vaultService.hasKey('gemini')) return true;
    return false;
  });

  /**
   * Returns frontier provider name for selected model if applicable.
   */
  public readonly selectedModelFrontierProvider = computed<string>(() => {
    const catalog = this.selectedCatalogEntry();
    if (catalog && catalog.isFrontier) return catalog.provider;
    const id = (this.selectedModelId() || '').toLowerCase();
    if (id.includes('claude')) return 'anthropic';
    if (id.includes('gpt') || id.includes('o1') || id.includes('o3')) return 'openai';
    if (id.includes('deepseek')) return 'deepseek';
    if (id.includes('gemini')) return 'gemini';
    return 'custom';
  });

  /**
   * Selects a model and closes the mobile drawer to reveal the detail pane.
   */
  public selectModel(modelId: string): void {
    this.selectedModelId.set(modelId);
    this.mobileDrawerOpen.set(false);
    void this.router.navigate([], { queryParams: { model: modelId }, queryParamsHandling: 'merge' });
  }

  public clearSelection(): void {
    this.selectedModelId.set(null);
    void this.router.navigate([], { queryParams: { model: null }, queryParamsHandling: 'merge' });
  }

  public toggleMobileDrawer(): void {
    this.mobileDrawerOpen.set(!this.mobileDrawerOpen());
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

  public readonly modelTaskPageSize = 15;
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

  // Epoch Handlers
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

  // Add Model Handlers (Phase S9.3 / S9.4)
  public openAddModelModal(): void {
    this.addModelTag.set('');
    this.addModelProvider.set('ollama');
    this.addModelParamSize.set(7);
    this.addModelContextWindow.set(16384);
    this.addModelTier.set('ROSTER');
    this.addModelRoles.set(['implementer']);
    this.addModelFeedback.set(null);
    this.showAddModelModal.set(true);
  }

  public selectCatalogPreset(entry: VerifiableModelEntry): void {
    this.addModelTag.set(entry.tag);
    this.addModelProvider.set(entry.provider);
    this.addModelParamSize.set(entry.parameterSize);
    this.addModelContextWindow.set(entry.contextWindow);
    this.addModelRoles.set([...entry.recommendedRoles]);
  }

  public async submitAddModel(): Promise<void> {
    const tag = this.addModelTag().trim();
    if (!tag) {
      this.addModelFeedback.set('Model tag is required.');
      return;
    }

    this.isSubmittingAddModel.set(true);
    this.addModelFeedback.set(null);

    const success = await this.fleetService.addModelProfile({
      modelId: tag,
      tier: this.addModelTier(),
      roles: this.addModelRoles(),
      contextWindow: Number(this.addModelContextWindow()),
    });

    this.isSubmittingAddModel.set(false);

    if (success) {
      this.showAddModelModal.set(false);
      this.selectModel(tag);
    } else {
      this.addModelFeedback.set(this.fleetService.error() || 'Failed to add model profile.');
    }
  }

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
