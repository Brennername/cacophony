import type { TelemetryRepository } from "@cacophony/db";
import type { HardwareTelemetrySnapshot, OllamaModelInfo } from "@cacophony/shared-types";
import type { IHardwareTelemetryProvider } from "./IHardwareTelemetryProvider.js";
import { ThermalGovernor } from "./ThermalGovernor.js";

export type TelemetryListener = (snapshot: HardwareTelemetrySnapshot) => void;

/**
 * TelemetryPoller
 *
 * Runs a continuous background polling loop harvesting hardware sensors and Ollama
 * VRAM residency, storing snapshots in the database and streaming to UI listeners.
 */
export class TelemetryPoller {
  private readonly provider: IHardwareTelemetryProvider;
  private readonly repository: TelemetryRepository | undefined;
  private readonly governor: ThermalGovernor;
  private readonly pollIntervalMs: number;
  private readonly ollamaBaseUrl: string;

  private timer: NodeJS.Timeout | null = null;
  private isPolling = false;
  private readonly listeners: Set<TelemetryListener> = new Set();
  private latestSnapshot: HardwareTelemetrySnapshot | null = null;

  constructor(options: {
    readonly provider: IHardwareTelemetryProvider;
    readonly repository?: TelemetryRepository;
    readonly governor?: ThermalGovernor;
    readonly pollIntervalMs?: number;
    readonly ollamaBaseUrl?: string;
  }) {
    this.provider = options.provider;
    this.repository = options.repository;
    this.governor = options.governor ?? new ThermalGovernor();
    this.pollIntervalMs = options.pollIntervalMs ?? 1000;
    this.ollamaBaseUrl = options.ollamaBaseUrl ?? (process.env["OLLAMA_BASE_URL"] || "http://127.0.0.1:11434");
  }

  /**
   * Registers a callback listener for live telemetry updates.
   */
  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    if (this.latestSnapshot) {
      listener(this.latestSnapshot);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Returns the most recent sampled telemetry snapshot.
   */
  public getLatest(): HardwareTelemetrySnapshot | null {
    return this.latestSnapshot;
  }

  /**
   * Starts the background polling interval.
   */
  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.pollOnce();
    }, this.pollIntervalMs);
    void this.pollOnce();
  }

  /**
   * Stops the background polling loop.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Executes a single sample and dispatch cycle.
   */
  public async pollOnce(): Promise<HardwareTelemetrySnapshot> {
    if (this.isPolling) {
      if (this.latestSnapshot) return this.latestSnapshot;
    }
    this.isPolling = true;

    try {
      const gpu = await this.provider.sample();
      const thermalEval = this.governor.evaluate(gpu.edgeTempCelsius);
      const activeModel = await this.queryOllamaActiveModel();

      const snapshot: HardwareTelemetrySnapshot = {
        timestamp: new Date().toISOString(),
        gpu,
        thermalZone: thermalEval.zone,
        pacingDelaySeconds: thermalEval.pacingDelaySeconds,
        activeModel
      };

      this.latestSnapshot = snapshot;

      if (this.repository) {
        try {
          await this.repository.insertSnapshot(snapshot);
        } catch {
          // Prevent transient DB error from crashing telemetry daemon
        }
      }

      for (const listener of this.listeners) {
        try {
          listener(snapshot);
        } catch {
          // Ignore listener errors
        }
      }

      return snapshot;
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Queries Ollama host HTTP /api/ps to retrieve loaded VRAM model details.
   */
  private async queryOllamaActiveModel(): Promise<OllamaModelInfo | null> {
    try {
      const url = `${this.ollamaBaseUrl}/api/ps`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = (await res.json()) as {
        readonly models?: readonly {
          readonly name: string;
          readonly model: string;
          readonly size?: number;
          readonly size_vram?: number;
          readonly details?: Record<string, string>;
        }[];
      };

      if (Array.isArray(data.models) && data.models.length > 0 && data.models[0]) {
        const m = data.models[0];
        return {
          name: m.name,
          model: m.model,
          sizeBytes: m.size ?? 0,
          vramSizeBytes: m.size_vram ?? 0,
          details: m.details
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}
