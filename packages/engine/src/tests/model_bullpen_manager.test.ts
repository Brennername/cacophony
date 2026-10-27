import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ModelBullpenManager } from "../scheduler/ModelBullpenManager.js";
import type { ModelRosterEntry, UpsertModelRosterInput } from "@cacophony/shared-types";

class MockModelRosterRepository {
  public entries: Map<string, ModelRosterEntry> = new Map();
  public evalCounts: Map<string, number> = new Map();

  public async upsert(input: UpsertModelRosterInput): Promise<ModelRosterEntry> {
    const existing = this.entries.get(input.modelId);
    const entry: ModelRosterEntry = {
      id: existing?.id ?? `id-${input.modelId}`,
      modelId: input.modelId,
      tier: input.tier ?? existing?.tier ?? "ROSTER",
      roles: input.roles ?? existing?.roles ?? ["implementer"],
      concurrencyLimit: input.concurrencyLimit ?? existing?.concurrencyLimit ?? 1,
      isActive: input.isActive ?? existing?.isActive ?? true,
      isProtected: input.isProtected ?? existing?.isProtected ?? false,
      evalTaskCount: this.evalCounts.get(input.modelId) ?? existing?.evalTaskCount ?? 0,
      notes: input.notes ?? existing?.notes ?? null,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.entries.set(input.modelId, entry);
    return entry;
  }

  public async getByModelId(modelId: string): Promise<ModelRosterEntry | null> {
    return this.entries.get(modelId) ?? null;
  }

  public async getActiveRoster(): Promise<readonly ModelRosterEntry[]> {
    return Array.from(this.entries.values()).filter((e) => e.tier === "ROSTER" && e.isActive);
  }

  public async incrementEvalCount(modelId: string): Promise<void> {
    const count = (this.evalCounts.get(modelId) ?? 0) + 1;
    this.evalCounts.set(modelId, count);
    const entry = this.entries.get(modelId);
    if (entry) {
      this.entries.set(modelId, { ...entry, evalTaskCount: count });
    }
  }
}

describe("ModelBullpenManager Suite (T-S5.3)", () => {
  it("enqueues candidate into Bullpen with BULLPEN tier and STAGED status", async () => {
    const repo = new MockModelRosterRepository();
    const manager = new ModelBullpenManager({ rosterRepo: repo as any });

    const candidate = await manager.queueCandidate("phi-4:14b", ["reasoning", "architect"]);

    assert.equal(candidate.modelId, "phi-4:14b");
    assert.equal(candidate.status, "STAGED");
    assert.deepEqual(candidate.targetRoles, ["reasoning", "architect"]);

    const dbRecord = await repo.getByModelId("phi-4:14b");
    assert.equal(dbRecord?.tier, "BULLPEN");
    assert.equal(dbRecord?.isActive, true);
  });

  it("records evaluation telemetry, tracks metrics, and holds promotion if below task threshold", async () => {
    const repo = new MockModelRosterRepository();
    const manager = new ModelBullpenManager({
      rosterRepo: repo as any,
      config: { minEvaluationTasks: 5, minPassRate: 0.8 },
    });

    await manager.queueCandidate("qwen2.5-coder:14b");

    // Record 3 successful evaluations (threshold is 5)
    for (let i = 0; i < 3; i++) {
      await manager.recordEvaluation({
        modelId: "qwen2.5-coder:14b",
        tokensPerSec: 28.5,
        latencyMs: 1200,
        vramUsedBytes: 9 * 1024 * 1024 * 1024,
        success: true,
        isTimeout: false,
      });
    }

    const profile = manager.getCandidateProfile("qwen2.5-coder:14b");
    assert.ok(profile);
    assert.equal(profile.status, "PROFILING");
    assert.equal(profile.totalEvaluations, 3);
    assert.equal(profile.successCount, 3);
    assert.equal(profile.passRate, 1.0);
    assert.equal(profile.promotionRecommended, false);

    const evalResult = manager.evaluatePromotion("qwen2.5-coder:14b");
    assert.equal(evalResult.recommendation, "HOLD");
    assert.equal(evalResult.eligibleForPromotion, false);
    assert.ok(evalResult.reason.includes("3/5 tasks completed"));
  });

  it("recommends promotion when candidate meets task threshold and pass rate gates", async () => {
    const repo = new MockModelRosterRepository();
    const manager = new ModelBullpenManager({
      rosterRepo: repo as any,
      config: { minEvaluationTasks: 5, minPassRate: 0.8, maxTimeoutRate: 0.1 },
    });

    await manager.queueCandidate("codestral:22b-q4_K_M");

    // Record 5 evaluations (4 success, 1 fail = 80% pass rate)
    for (let i = 0; i < 4; i++) {
      await manager.recordEvaluation({
        modelId: "codestral:22b-q4_K_M",
        tokensPerSec: 22.0,
        latencyMs: 2500,
        vramUsedBytes: 13 * 1024 * 1024 * 1024,
        success: true,
        isTimeout: false,
      });
    }

    const finalProfile = await manager.recordEvaluation({
      modelId: "codestral:22b-q4_K_M",
      tokensPerSec: 20.0,
      latencyMs: 2800,
      vramUsedBytes: 13 * 1024 * 1024 * 1024,
      success: false,
      isTimeout: false,
    });

    assert.equal(finalProfile.status, "EVALUATED");
    assert.equal(finalProfile.totalEvaluations, 5);
    assert.equal(finalProfile.passRate, 0.8);
    assert.equal(finalProfile.promotionRecommended, true);

    const evalResult = manager.evaluatePromotion("codestral:22b-q4_K_M");
    assert.equal(evalResult.recommendation, "PROMOTE");
    assert.equal(evalResult.eligibleForPromotion, true);
    assert.ok(evalResult.reason.includes("Candidate satisfied all promotion gates"));
  });

  it("promotes candidate to ROSTER tier in database and marks profile as PROMOTED", async () => {
    const repo = new MockModelRosterRepository();
    const manager = new ModelBullpenManager({ rosterRepo: repo as any });

    await manager.queueCandidate("codestral:22b-q4_K_M", ["implementer", "reviewer"]);
    const promoted = await manager.promoteCandidate("codestral:22b-q4_K_M");

    assert.equal(promoted.tier, "ROSTER");
    assert.equal(promoted.isActive, true);
    assert.equal(promoted.isProtected, true);

    const profile = manager.getCandidateProfile("codestral:22b-q4_K_M");
    assert.equal(profile?.status, "PROMOTED");
  });

  it("recommends EJECT on repeated timeouts and safely deprovisions weights without erasing telemetry", async () => {
    const repo = new MockModelRosterRepository();
    let deprovisionedModel: string | null = null;
    const mockModelManager = {
      deleteModel: async (modelId: string) => {
        deprovisionedModel = modelId;
        return true;
      },
    };

    const manager = new ModelBullpenManager({
      rosterRepo: repo as any,
      modelManager: mockModelManager,
    });

    await manager.queueCandidate("slow-flaky-model:latest");

    // 3 consecutive timeouts
    for (let i = 0; i < 3; i++) {
      await manager.recordEvaluation({
        modelId: "slow-flaky-model:latest",
        tokensPerSec: 2.0,
        latencyMs: 840000,
        vramUsedBytes: 15 * 1024 * 1024 * 1024,
        success: false,
        isTimeout: true,
      });
    }

    const evalResult = manager.evaluatePromotion("slow-flaky-model:latest");
    assert.equal(evalResult.recommendation, "EJECT");
    assert.equal(evalResult.eligibleForPromotion, false);
    assert.ok(evalResult.reason.includes("Candidate exceeded timeout budget"));

    // Eject candidate
    await manager.demoteOrEject("slow-flaky-model:latest", evalResult.reason);

    assert.equal(deprovisionedModel, "slow-flaky-model:latest");
    const dbRecord = await repo.getByModelId("slow-flaky-model:latest");
    assert.equal(dbRecord?.tier, "RETIRED");
    assert.equal(dbRecord?.isActive, false);

    // Profile retains historical metrics for benchmark reporting
    const profile = manager.getCandidateProfile("slow-flaky-model:latest");
    assert.equal(profile?.status, "REJECTED");
    assert.equal(profile?.timeoutCount, 3);
  });

  it("blocks promotion if peak VRAM exceeds hardware budget", async () => {
    const repo = new MockModelRosterRepository();
    const manager = new ModelBullpenManager({
      rosterRepo: repo as any,
      config: {
        minEvaluationTasks: 3,
        minPassRate: 0.8,
        maxVramBytes: 16 * 1024 * 1024 * 1024, // 16GB limit
      },
    });

    await manager.queueCandidate("heavy-giant:70b");

    for (let i = 0; i < 3; i++) {
      await manager.recordEvaluation({
        modelId: "heavy-giant:70b",
        tokensPerSec: 15.0,
        latencyMs: 3000,
        vramUsedBytes: 24 * 1024 * 1024 * 1024, // 24GB allocation
        success: true,
        isTimeout: false,
      });
    }

    const evalResult = manager.evaluatePromotion("heavy-giant:70b");
    assert.equal(evalResult.recommendation, "HOLD");
    assert.equal(evalResult.eligibleForPromotion, false);
    assert.ok(evalResult.reason.includes("exceeds physical headroom budget"));
  });

  it("provides comprehensive Bullpen status overview", async () => {
    const repo = new MockModelRosterRepository();
    const manager = new ModelBullpenManager({ rosterRepo: repo as any });

    await repo.upsert({ modelId: "deepseek-coder-v2:16b", tier: "ROSTER" });
    await manager.queueCandidate("candidate-1");
    await manager.queueCandidate("candidate-2");

    await manager.recordEvaluation({
      modelId: "candidate-2",
      tokensPerSec: 30,
      latencyMs: 1000,
      vramUsedBytes: 4 * 1024 * 1024 * 1024,
      success: true,
      isTimeout: false,
    });

    const status = await manager.getBullpenStatus();
    assert.equal(status.activeRosterCount, 1);
    assert.equal(status.bullpenCandidates.length, 2);
    assert.equal(status.stagedCount, 1);
    assert.equal(status.profilingCount, 1);
  });
});
