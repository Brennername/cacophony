/**
 * Unit tests for ModelMetadataInferrer and ModelAutoDiscoveryService.
 * Validates zero-configuration onboarding, dynamic role attribution,
 * and roster/bullpen tiering without hardcoding model catalogs.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ModelMetadataInferrer,
} from "../scheduler/ModelMetadataInferrer.js";
import {
  ModelAutoDiscoveryService,
} from "../scheduler/ModelAutoDiscoveryService.js";
import type { OllamaStateProbe } from "../scheduler/OllamaStateProbe.js";
import type {
  ModelRosterEntry,
  UpsertModelRosterInput,
} from "@cacophony/shared-types";

describe("ModelMetadataInferrer", () => {
  it("infers parameters, context windows, and suggested roles for diverse architectures", () => {
    const ds16b = ModelMetadataInferrer.infer("deepseek-coder-v2:16b", false);
    assert.equal(ds16b.parameterSizeBillions, 16);
    assert.equal(ds16b.numCtx, 16384);
    assert.deepEqual(ds16b.suggestedRoles, ["implementer", "reviewer"]);
    assert.equal(ds16b.suggestedTier, "ROSTER");

    const qwen7b = ModelMetadataInferrer.infer("qwen2.5-coder:7b-instruct-q4_K_M", false);
    assert.equal(qwen7b.parameterSizeBillions, 7);
    assert.equal(qwen7b.numCtx, 16384);
    assert.ok(qwen7b.suggestedRoles.includes("reviewer"));
    assert.equal(qwen7b.suggestedTier, "ROSTER");

    const codestral = ModelMetadataInferrer.infer("codestral:22b-v0.1", false);
    assert.equal(codestral.parameterSizeBillions, 22);
    assert.equal(codestral.numCtx, 32768);
    assert.deepEqual(codestral.suggestedRoles, ["implementer", "reviewer"]);
    assert.equal(codestral.suggestedTier, "BOUTIQUE");

    const smol = ModelMetadataInferrer.infer("smollm2:135m", false);
    assert.equal(smol.parameterSizeBillions, 0.135);
    assert.equal(smol.suggestedTier, "BULLPEN");
  });

  it("assigns first discovered model to ROSTER if roster is currently empty", () => {
    const fallbackModel = ModelMetadataInferrer.infer("unknown-experimental-model", true);
    assert.equal(fallbackModel.suggestedTier, "ROSTER");
  });
});

describe("ModelAutoDiscoveryService", () => {
  it("reconciles physical Ollama tags into roster and protects models in tenancy guard", async () => {
    const mockProbe = {
      getInstalledModels: async () => [
        "deepseek-coder-v2:16b",
        "qwen2.5-coder:7b-instruct-q4_K_M",
        "qwen2.5-coder:14b",
      ],
    } as unknown as OllamaStateProbe;

    const rosterMap = new Map<string, ModelRosterEntry>();

    const mockRosterRepo = {
      getAll: async () => Array.from(rosterMap.values()),
      getActiveRoster: async () =>
        Array.from(rosterMap.values()).filter((e) => e.tier === "ROSTER" && e.isActive),
      getActiveBullpen: async () =>
        Array.from(rosterMap.values()).filter((e) => e.tier === "BULLPEN" && e.isActive),
      listByTier: async (tier: string) =>
        Array.from(rosterMap.values()).filter((e) => e.tier === tier),
      upsert: async (input: UpsertModelRosterInput) => {
        const entry: ModelRosterEntry = {
          id: `roster-${input.modelId}`,
          modelId: input.modelId,
          tier: input.tier ?? "ROSTER",
          roles: input.roles ? [...input.roles] : ["implementer"],
          concurrencyLimit: input.concurrencyLimit ?? 1,
          evalTaskCount: 0,
          isActive: input.isActive ?? true,
          isProtected: input.isProtected ?? true,
          notes: input.notes ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        rosterMap.set(input.modelId, entry);
        return entry;
      },
    } as any;

    const mockProfileRepo = {
      getActiveProfile: async () => null,
      upsertProfile: async () => ({ id: "mock" } as any),
    } as any;

    const protectedList: string[] = [];
    const mockTenancyGuard = {
      isProtected: (model: string) => protectedList.includes(model),
      getConfig: () => ({ protectedModels: protectedList }),
      updateConfig: (cfg: { protectedModels: string[] }) => {
        protectedList.length = 0;
        protectedList.push(...cfg.protectedModels);
      },
    } as any;

    const service = new ModelAutoDiscoveryService(
      mockProbe,
      mockRosterRepo,
      mockProfileRepo,
      mockTenancyGuard,
    );

    const result = await service.reconcile();

    assert.equal(result.installedCount, 3);
    assert.equal(result.discovered.length, 3);

    assert.ok(rosterMap.has("deepseek-coder-v2:16b"));
    assert.ok(rosterMap.has("qwen2.5-coder:7b-instruct-q4_K_M"));
    assert.ok(rosterMap.has("qwen2.5-coder:14b"));

    // Verify all 3 models were protected in TenancyGuard
    assert.ok(protectedList.includes("deepseek-coder-v2:16b"));
    assert.ok(protectedList.includes("qwen2.5-coder:7b-instruct-q4_K_M"));
    assert.ok(protectedList.includes("qwen2.5-coder:14b"));
  });
});
