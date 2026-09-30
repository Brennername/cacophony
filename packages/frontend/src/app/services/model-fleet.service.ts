import { Injectable, signal, computed } from '@angular/core';
import type {
  OllamaInstalledModel,
  OllamaPullProgressEvent,
  ModelManagementConfig
} from '@cacophony/shared-types';

/**
 * ModelFleetService
 *
 * Reactive client managing the local Ollama model fleet, tenancy rulesets,
 * live SSE model pull progress streams, benchmarking triggers, and safe model evictions.
 */
@Injectable({
  providedIn: 'root'
})
export class ModelFleetService {
  public readonly installedModels = signal<OllamaInstalledModel[]>([]);
  public readonly config = signal<ModelManagementConfig>({
    managedModelsEnabled: true,
    protectedModels: ['deepseek-r1:8b-4k', 'qwen2.5-coder:7b-instruct-q4_K_M'],
    maxDiskStorageGb: 50,
    autoEvictionEnabled: true,
    minimumSuccessRateThreshold: 0.4,
    maxConsecutiveFailuresBeforeEviction: 3
  });
  public readonly loading = signal<boolean>(false);
  public readonly pullingModelName = signal<string | null>(null);
  public readonly pullProgress = signal<OllamaPullProgressEvent | null>(null);
  public readonly pullTerminalLogs = signal<string[]>([]);
  public readonly error = signal<string | null>(null);

  public readonly protectedCount = computed(() =>
    this.installedModels().filter((m) => m.isProtected).length
  );

  public readonly warmModel = computed(() =>
    this.installedModels().find((m) => m.isLoadedInVram) || null
  );

  constructor() {
    this.setupSseListener();
    void this.fetchInstalledModels();
    void this.fetchConfig();
    void this.fetchProfiles();
  }

  /**
   * Helper formatting raw byte counts into human-readable strings (MB, GB).
   */
  public formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }

  /**
   * Refreshes the list of installed models from GET /api/models/installed.
   */
  public async fetchInstalledModels(): Promise<void> {
    try {
      const res = await fetch('/api/models/installed');
      if (res.ok) {
        const data = (await res.json()) as OllamaInstalledModel[];
        this.installedModels.set(data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(`Failed to fetch models: ${msg}`);
    }
  }

  /**
   * Fetches active tenancy configuration from GET /api/models/config.
   */
  public async fetchConfig(): Promise<void> {
    try {
      const res = await fetch('/api/models/config');
      if (res.ok) {
        const data = (await res.json()) as ModelManagementConfig;
        this.config.set(data);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Updates tenancy configuration via PUT /api/models/config.
   */
  public async updateConfig(partial: Partial<ModelManagementConfig>): Promise<boolean> {
    try {
      const res = await fetch('/api/models/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial)
      });
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; config: ModelManagementConfig };
        this.config.set(data.config);
        await this.fetchInstalledModels();
        return true;
      }
      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(`Failed to update config: ${msg}`);
      return false;
    }
  }

  /**
   * Triggers a model pull request to POST /api/models/pull.
   */
  public async pullModel(modelName: string): Promise<boolean> {
    this.pullingModelName.set(modelName);
    this.pullProgress.set({ status: 'Starting download...' });
    this.pullTerminalLogs.set([`[info] Initiating pull for model '${modelName}'...`]);

    try {
      const res = await fetch('/api/models/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName })
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        const msg = errData.error || `HTTP ${res.status}`;
        this.pullTerminalLogs.update((logs) => [...logs, `[error] Pull rejected: ${msg}`]);
        this.pullingModelName.set(null);
        return false;
      }

      this.pullTerminalLogs.update((logs) => [...logs, `[ok] Pull request accepted by daemon. Streaming layers...`]);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.pullTerminalLogs.update((logs) => [...logs, `[fatal] ${msg}`]);
      this.pullingModelName.set(null);
      return false;
    }
  }

  /**
   * Evicts/deletes a model via DELETE /api/models/:modelId.
   */
  public async deleteModel(modelId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/models/${encodeURIComponent(modelId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await this.fetchInstalledModels();
        return true;
      }
      const errData = (await res.json().catch(() => ({}))) as { error?: string };
      this.error.set(errData.error || `Failed to delete ${modelId}`);
      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      return false;
    }
  }

  /**
   * Runs an on-demand benchmark via POST /api/models/benchmark.
   */
  public async benchmarkModel(modelId: string): Promise<unknown> {
    this.loading.set(true);
    try {
      const res = await fetch('/api/models/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId })
      });
      if (res.ok) {
        return await res.json();
      }
      throw new Error(`HTTP ${res.status}`);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Connects to Server-Sent Events to listen for model_pull_progress events.
   */
  private setupSseListener(): void {
    if (typeof EventSource === 'undefined') return;
    try {
      const eventSource = new EventSource('/api/events');
      eventSource.addEventListener('model_pull_progress', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as OllamaPullProgressEvent & { model: string; error?: string };
          this.pullProgress.set(data);

          let logLine = `[${data.model}] ${data.status}`;
          if (data.percent !== undefined) {
            logLine += ` (${data.percent}%)`;
          }
          if (data.error) {
            logLine += ` ERROR: ${data.error}`;
          }

          this.pullTerminalLogs.update((logs) => {
            const next = [...logs, logLine];
            return next.slice(-200); // keep last 200 lines
          });

          if (data.status === 'success' || data.error) {
            void this.fetchInstalledModels();
            if (data.status === 'success') {
              this.pullingModelName.set(null);
            }
          }
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }
  }

  public readonly profiles = signal<readonly import('@cacophony/shared-types').ModelTuningProfile[]>([]);

  /**
   * Fetches active model tuning profiles from GET /api/models/profiles.
   */
  public async fetchProfiles(): Promise<void> {
    try {
      const res = await fetch('/api/models/profiles');
      if (res.ok) {
        const data = await res.json();
        this.profiles.set(data);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Updates an existing profile via PUT /api/models/profiles/:id.
   */
  public async saveProfile(profile: import('@cacophony/shared-types').ModelTuningProfile): Promise<void> {
    try {
      const res = await fetch(`/api/models/profiles/${encodeURIComponent(profile.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        await this.fetchProfiles();
      }
    } catch {
      // ignore
    }
  }

  /**
   * Triggers autonomous auto-tuning via POST /api/models/profiles/auto-tune.
   */
  public async autoTuneProfiles(): Promise<void> {
    try {
      const res = await fetch('/api/models/profiles/auto-tune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        await this.fetchProfiles();
      }
    } catch {
      // ignore
    }
  }
}
