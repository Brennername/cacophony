import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ModelEvictionManager } from "../scheduler/ModelEvictionManager.js";
import type { ModelHealthProfile } from "@cacophony/db";

describe("ModelEvictionManager Suite (T69.6.4)", () => {
  function createMockHealthRepo(initialProfiles: Record<string, Partial<ModelHealthProfile>> = {}) {
    const profiles: Record<string, ModelHealthProfile> = {};

    for (const [id, partial] of Object.entries(initialProfiles)) {
      profiles[id] = {
        modelId: id,
        provider: "ollama",
        totalTasks: partial.totalTasks ?? 0,
        totalSuccess: partial.totalSuccess ?? 0,
        totalFailures: partial.totalFailures ?? 0,
        consecutiveFailures: partial.consecutiveFailures ?? 0,
        avgLatencyMs: partial.avgLatencyMs ?? 1000,
        avgTokensPerSec: partial.avgTokensPerSec ?? 30,
        status: partial.status ?? "ACTIVE",
        lastUsedAt: partial.lastUsedAt ?? new Date().toISOString(),
        totalRemediationAttempts: 0,
        totalRemediationSuccess: 0,
        remediationRecoveryRate: 0,
      };
    }

    return {
      profiles,
      async getProfile(modelId: string): Promise<ModelHealthProfile> {
        if (!profiles[modelId]) {
          profiles[modelId] = {
            modelId,
            provider: "ollama",
            totalTasks: 0,
            totalSuccess: 0,
            totalFailures: 0,
            consecutiveFailures: 0,
            avgLatencyMs: 0,
            avgTokensPerSec: 0,
            status: "ACTIVE",
            lastUsedAt: null,
            totalRemediationAttempts: 0,
            totalRemediationSuccess: 0,
            remediationRecoveryRate: 0,
          };
        }
        return profiles[modelId]!;
      },
      async recordRun(
        modelId: string,
        _provider: string,
        success: boolean,
        durationMs: number,
        tokensPerSec: number,
      ): Promise<void> {
        const p = await this.getProfile(modelId);
        p.totalTasks++;
        if (success) {
          p.totalSuccess++;
          p.consecutiveFailures = 0;
        } else {
          p.totalFailures++;
          p.consecutiveFailures++;
        }
        p.avgLatencyMs = durationMs;
        p.avgTokensPerSec = tokensPerSec;
      },
      async updateStatus(modelId: string, status: any): Promise<void> {
        const p = await this.getProfile(modelId);
        p.status = status;
      },
    };
  }

  it("evaluates model promotion and demotion based on rolling pass rate", async () => {
    // Model with 1 success and 4 failures = 20% pass rate (below 50%)
    const healthRepo = createMockHealthRepo({
      "failing-model:7b": {
        totalTasks: 5,
        totalSuccess: 1,
        totalFailures: 4,
        consecutiveFailures: 1,
      },
      "stellar-model:7b": {
        totalTasks: 5,
        totalSuccess: 4,
        totalFailures: 1,
        consecutiveFailures: 0,
      },
    });

    const manager = new ModelEvictionManager(healthRepo as any, 3, 0);

    const demotionResult = await manager.evaluateModelPromotionDemotion("failing-model:7b");
    assert.equal(demotionResult.role, "reviewer", "Failing model should be auto-demoted to reviewer");
    assert.equal(demotionResult.action, "demoted");
    assert.equal(manager.getModelRole("failing-model:7b"), "reviewer");

    const promotionResult = await manager.evaluateModelPromotionDemotion("stellar-model:7b");
    assert.equal(promotionResult.role, "implementer", "High performing model should be promoted to implementer");
    assert.equal(manager.getModelRole("stellar-model:7b"), "implementer");
  });

  it("recordRunOutcome automatically triggers promotion/demotion evaluation", async () => {
    const healthRepo = createMockHealthRepo({
      "borderline-model:7b": {
        totalTasks: 3,
        totalSuccess: 1,
        totalFailures: 2,
        consecutiveFailures: 1,
      },
    });

    const manager = new ModelEvictionManager(healthRepo as any, 5, 0);

    // Another failure makes totalTasks=4, totalSuccess=1, passRate=25% (< 50%)
    await manager.recordRunOutcome("borderline-model:7b", false, 1200, 25);

    assert.equal(manager.getModelRole("borderline-model:7b"), "reviewer");
  });

  it("selectModel penalizes demoted models for implementer role while routing to reviewer", async () => {
    const healthRepo = createMockHealthRepo({
      "demoted-model:7b": {
        totalTasks: 10,
        totalSuccess: 3,
        totalFailures: 7,
      },
      "good-model:7b": {
        totalTasks: 10,
        totalSuccess: 9,
        totalFailures: 1,
      },
    });

    const manager = new ModelEvictionManager(healthRepo as any, 10, 0);
    manager.setModelRole("demoted-model:7b", "reviewer");
    manager.setModelRole("good-model:7b", "implementer");

    // Select for implementer role multiple times: good-model should dominate
    let goodCount = 0;
    for (let i = 0; i < 50; i++) {
      const selected = await manager.selectModel(
        "implementer",
        ["demoted-model:7b", "good-model:7b"],
        null,
      );
      if (selected === "good-model:7b") {
        goodCount++;
      }
    }

    assert.ok(goodCount > 40, `Good model should be overwhelmingly chosen over demoted reviewer (${goodCount}/50)`);
  });
});
