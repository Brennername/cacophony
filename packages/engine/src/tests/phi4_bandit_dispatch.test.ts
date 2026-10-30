import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BanditTaskScheduler } from "../bandit/BanditTaskScheduler.js";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";
import { ModelRoleSelector } from "../scheduler/ModelRoleSelector.js";
import { ModelEvictionManager } from "../scheduler/ModelEvictionManager.js";
import { ThermalGovernor } from "../telemetry/ThermalGovernor.js";
import { QueueGroomer } from "../scheduler/QueueGroomer.js";
import type { TaskRecord } from "@cacophony/shared-types";

describe("Phi4 Bandit Dispatch & Installed Model Synchronization", () => {
  const makeTask = (
    id: string,
    role: string,
    model: string | null = null,
  ): TaskRecord => ({
    id,
    title: id,
    prompt: "test prompt",
    role: role as any,
    status: "PENDING",
    priority: "P1",
    modelAssigned: model,
    testCommand: null,
    focusFiles: null,
    targetBranch: null,
    prUrl: null,
    failureCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  });

  it("should register phi4:latest and all installed models across all agent roles", () => {
    const bandit = new BanditTaskScheduler({ explorationRate: 0.2 });
    const installed = [
      "phi4:latest",
      "deepseek-coder-v2:16b",
      "qwen2.5-coder:7b-instruct-q4_K_M",
      "gemma3:4b",
    ];

    bandit.syncInstalledModels(installed, [
      "implementer",
      "reviewer",
      "architect",
      "test_engineer",
      "type_specialist",
    ]);

    const implementerArms = bandit.getArms("implementer");
    const reviewerArms = bandit.getArms("reviewer");
    const architectArms = bandit.getArms("architect");

    assert.ok(implementerArms.some((a) => a.modelId === "phi4:latest"));
    assert.ok(reviewerArms.some((a) => a.modelId === "phi4:latest"));
    assert.ok(architectArms.some((a) => a.modelId === "phi4:latest"));

    assert.ok(implementerArms.some((a) => a.modelId === "deepseek-coder-v2:16b"));
    assert.ok(implementerArms.some((a) => a.modelId === "qwen2.5-coder:7b-instruct-q4_K_M"));
    assert.ok(implementerArms.some((a) => a.modelId === "gemma3:4b"));
  });

  it("should select phi4:latest when historical reward or exploration selects it", () => {
    const bandit = new BanditTaskScheduler({ explorationRate: 0.0 });
    // Register arms with phi4 having superior win rate (alpha=10, beta=1)
    bandit.registerArm("phi4:latest", "implementer", 10, 1);
    bandit.registerArm("qwen2.5-coder:7b-instruct-q4_K_M", "implementer", 4, 6);
    bandit.registerArm("deepseek-coder-v2:16b", "implementer", 5, 5);

    const candidates = [
      "phi4:latest",
      "qwen2.5-coder:7b-instruct-q4_K_M",
      "deepseek-coder-v2:16b",
    ];

    const outcome = bandit.selectModel("implementer", candidates);
    assert.equal(outcome.selectedModel, "phi4:latest");
    assert.equal(outcome.isExploratory, false);
    assert.ok(outcome.confidenceScore >= 0.8);
  });

  it("should select phi4:latest through TaskScheduler with integrated BanditTaskScheduler", async () => {
    const bandit = new BanditTaskScheduler({ explorationRate: 0.0 });
    bandit.registerArm("phi4:latest", "implementer", 20, 1);
    bandit.registerArm("deepseek-coder-v2:16b", "implementer", 2, 8);

    const mockHealthRepo: any = {
      isEjected: async () => false,
      isDegraded: async () => false,
      recordTrial: async () => {},
    };

    const mockTaskRepo: any = {
      updateModel: async () => {},
    };

    const evictionManager = new ModelEvictionManager(mockHealthRepo, 3, 0.25);
    const governor = new ThermalGovernor();
    const groomer = new QueueGroomer();

    const scheduler = new TaskScheduler({
      taskRepo: mockTaskRepo,
      stageRepo: {} as any,
      evictionManager,
      governor,
      groomer,
      roleSelector: new ModelRoleSelector(),
      telemetryProvider: {
        sample: async () => ({
          edgeTempCelsius: 45,
          hotspotTempCelsius: 50,
          vramUsedBytes: 2 * 1024 * 1024 * 1024,
          vramTotalBytes: 16 * 1024 * 1024 * 1024,
          powerWatts: 25,
          fanRpm: 1200,
          timestamp: new Date().toISOString(),
        }),
      } as any,
      probe: {
        getInstalledModels: async () => [
          "phi4:latest",
          "deepseek-coder-v2:16b",
          "qwen2.5-coder:7b-instruct-q4_K_M",
        ],
        getModelVramRequirementBytes: async () => 9 * 1024 * 1024 * 1024,
        isOllamaRunning: async () => true,
        getActiveModelVramUsage: async () => null,
      } as any,
      banditScheduler: bandit,
    });

    const task = makeTask("task-phi4-01", "implementer", "deepseek-coder-v2:16b");
    const selectedModel = await scheduler.selectCandidateModel(task, null);
    assert.equal(selectedModel, "phi4:latest");
  });

  it("should return phi4:latest among eligible candidate models for resource fallback", async () => {
    const bandit = new BanditTaskScheduler({ explorationRate: 0.15 });
    bandit.registerArm("phi4:latest", "implementer");

    const scheduler = new TaskScheduler({
      taskRepo: {} as any,
      stageRepo: {} as any,
      evictionManager: new ModelEvictionManager({} as any, 3, 0.25),
      governor: new ThermalGovernor(),
      groomer: new QueueGroomer(),
      roleSelector: new ModelRoleSelector(),
      telemetryProvider: {} as any,
      probe: {
        getInstalledModels: async () => [
          "phi4:latest",
          "deepseek-coder-v2:16b",
          "smollm2:135m",
        ],
      } as any,
      banditScheduler: bandit,
    });

    const task = makeTask("task-fallback-01", "implementer");
    const candidates = await scheduler.getEligibleCandidateModels(task);
    assert.ok(candidates.includes("phi4:latest"));
    assert.ok(candidates.includes("deepseek-coder-v2:16b"));
    // smollm should be excluded from coding models
    assert.ok(!candidates.includes("smollm2:135m"));
  });
});
