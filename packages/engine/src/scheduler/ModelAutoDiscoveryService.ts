import type { ModelRosterRepository, ModelProfileRepository } from "@cacophony/db";
import type { ModelLifecycleRole, ModelRosterEntry } from "@cacophony/shared-types";
import { OllamaStateProbe } from "./OllamaStateProbe.js";
import { ModelMetadataInferrer } from "./ModelMetadataInferrer.js";
import { ModelTenancyGuard } from "./ModelTenancyGuard.js";
import { StructuredLogger } from "../telemetry/StructuredLogger.js";

export interface ReconciliationResult {
  readonly installedCount: number;
  readonly discovered: readonly string[];
  readonly autoConfigured: readonly string[];
  readonly activeRoster: readonly string[];
  readonly activeBullpen: readonly string[];
}

/**
 * ModelAutoDiscoveryService
 *
 * Continuously reconciles physical Ollama disk models with the dynamic Roster and Bullpen:
 * 1. Guarantees Cacophony is aware of exactly what models exist on disk.
 * 2. Ensures the scheduler NEVER attempts to dispatch tasks to models that are not installed.
 * 3. Automatically discovers any unknown models that appear, infers their metadata,
 *    and registers optimal tuning parameters, tenancy protection, and role assignments.
 */
export class ModelAutoDiscoveryService {
  private readonly logger = new StructuredLogger("ModelAutoDiscoveryService");

  constructor(
    private readonly probe: OllamaStateProbe,
    private readonly rosterRepo: ModelRosterRepository,
    private readonly profileRepo?: ModelProfileRepository,
    private readonly tenancyGuard?: ModelTenancyGuard,
  ) {}

  /**
   * Reconciles physical models in Ollama with database-backed roster and bullpen entries.
   */
  public async reconcile(): Promise<ReconciliationResult> {
    const installed = await this.probe.getInstalledModels();
    const existingEntries = await this.rosterRepo.listByTier();
    const existingMap = new Map<string, ModelRosterEntry>(
      existingEntries.map((e) => [e.modelId, e]),
    );

    const discovered: string[] = [];
    const autoConfigured: string[] = [];

    const isRosterEmpty = existingEntries.filter((e) => e.tier === "ROSTER" && e.isActive).length === 0;

    // 1. Process all physically installed models
    for (const modelId of installed) {
      const existing = existingMap.get(modelId);

      if (!existing) {
        // Unknown model detected on disk: automatically infer and configure
        const inferred = ModelMetadataInferrer.infer(modelId, isRosterEmpty);
        const rosterInput = ModelMetadataInferrer.toRosterInput(inferred);

        await this.rosterRepo.upsert(rosterInput);

        // Auto-configure tuning profile if repository is available
        if (this.profileRepo) {
          const role = inferred.suggestedRoles[0] || "general";
          await this.profileRepo.upsertProfile({
            id: `profile-${role}-${modelId.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
            modelName: modelId,
            role,
            numPredict: inferred.numPredict,
            numCtx: inferred.numCtx,
            temperature: inferred.temperature,
            topK: 40,
            topP: 0.9,
            repeatPenalty: 1.1,
            autoTuned: true,
            isActive: true,
          });
        }

        // Ensure newly discovered models are protected from accidental automated eviction
        if (this.tenancyGuard) {
          const currentConfig = this.tenancyGuard.getConfig();
          if (!this.tenancyGuard.isProtected(modelId)) {
            this.tenancyGuard.updateConfig({
              protectedModels: [...currentConfig.protectedModels, modelId],
            });
          }
        }

        discovered.push(modelId);
        autoConfigured.push(modelId);

        this.logger.info(`Auto-discovered and configured new model '${modelId}'`, {
          modelId,
          tier: inferred.suggestedTier,
          roles: inferred.suggestedRoles,
          parameterSize: inferred.parameterSizeBillions,
          numCtx: inferred.numCtx,
        });
      } else if (!existing.isActive) {
        // Model was previously marked inactive but is now present on disk
        await this.rosterRepo.upsert({
          modelId,
          isActive: true,
        });
      }
    }

    // 2. Mark any roster entries whose weights are missing from disk as inactive
    const installedSet = new Set(installed);
    for (const entry of existingEntries) {
      if (!installedSet.has(entry.modelId) && entry.isActive) {
        await this.rosterRepo.upsert({
          modelId: entry.modelId,
          isActive: false,
          notes: `${entry.notes || ""} [Weights missing from disk]`.trim(),
        });
        this.logger.warn(`Model '${entry.modelId}' is not present on disk; deactivated in roster`, {
          modelId: entry.modelId,
        });
      }
    }

    const activeRosterEntries = await this.rosterRepo.getActiveRoster();
    const activeBullpenEntries = await this.rosterRepo.getActiveBullpen();

    return {
      installedCount: installed.length,
      discovered,
      autoConfigured,
      activeRoster: activeRosterEntries.map((e) => e.modelId),
      activeBullpen: activeBullpenEntries.map((e) => e.modelId),
    };
  }

  /**
   * Evaluates whether a model is physically installed and active in the system.
   */
  public async isModelAvailable(modelId: string): Promise<boolean> {
    const installed = await this.probe.getInstalledModels();
    return installed.includes(modelId);
  }

  /**
   * Retrieves active, installed models designated for a specific functional role.
   */
  public async getAvailableModelsForRole(role: ModelLifecycleRole): Promise<readonly string[]> {
    const installed = await this.probe.getInstalledModels();
    const installedSet = new Set(installed);
    const roleModels = await this.rosterRepo.getModelsForRole(role);

    // Strict safety filter: ONLY return models physically present on disk
    return roleModels.filter((modelId) => installedSet.has(modelId));
  }
}
