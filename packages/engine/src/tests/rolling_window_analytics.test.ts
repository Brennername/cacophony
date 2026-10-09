import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { TaskRecord } from "@cacophony/shared-types";
import { RollingWindowAnalyticsService } from "../analytics/RollingWindowAnalyticsService.js";

describe("RollingWindowAnalyticsService Suite (T85.1)", () => {
  const createMockTask = (id: string, status: "COMPLETED" | "FAILED", role = "implementer", model = "qwen2.5-coder:7b"): TaskRecord => ({
    id,
    title: `Task ${id}`,
    prompt: `Prompt for ${id}`,
    role: role as any,
    status,
    priority: "P1",
    modelAssigned: model,
    testCommand: null,
    focusFiles: null,
    targetBranch: null,
    prUrl: null,
    failureCount: status === "FAILED" ? 1 : 0,
    createdAt: new Date(Date.now() - 60000).toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });

  it("handles boundary condition with 0 or 1 tasks gracefully", async () => {
    const mockSource = {
      listRecent: async () => [createMockTask("1", "COMPLETED")],
    };

    const service = new RollingWindowAnalyticsService(mockSource);
    const metrics = await service.computeRollingMetrics({ windowSize: 10, minSampleSize: 2 });

    assert.equal(metrics.sampleCount, 1);
    assert.equal(metrics.successCount, 1);
    assert.equal(metrics.failureCount, 0);
    assert.equal(metrics.velocityDelta, 0.0);
    assert.equal(metrics.isPlateaued, false);
  });

  it("computes accurate success rates across dynamic window sizes", async () => {
    const tasks: TaskRecord[] = [
      createMockTask("1", "COMPLETED"),
      createMockTask("2", "COMPLETED"),
      createMockTask("3", "FAILED"),
      createMockTask("4", "COMPLETED"),
      createMockTask("5", "FAILED"),
      createMockTask("6", "COMPLETED"),
      createMockTask("7", "COMPLETED"),
      createMockTask("8", "COMPLETED"),
    ];

    const mockSource = {
      listRecent: async () => tasks,
    };

    const service = new RollingWindowAnalyticsService(mockSource);

    // Window size 5
    const metrics5 = await service.computeRollingMetrics({ windowSize: 5 });
    assert.equal(metrics5.sampleCount, 5);
    // 3 completed, 2 failed
    assert.equal(metrics5.successCount, 3);
    assert.equal(metrics5.failureCount, 2);
    assert.equal(metrics5.successRatePercent, 60.0);

    // Full window 8
    const metrics8 = await service.computeRollingMetrics({ windowSize: 8 });
    assert.equal(metrics8.sampleCount, 8);
    // 6 completed, 2 failed
    assert.equal(metrics8.successCount, 6);
    assert.equal(metrics8.failureCount, 2);
    assert.equal(metrics8.successRatePercent, 75.0);
  });

  it("applies multi-dimensional qualification filters (role, model)", async () => {
    const tasks: TaskRecord[] = [
      createMockTask("1", "COMPLETED", "implementer", "qwen2.5-coder:7b"),
      createMockTask("2", "FAILED", "architect", "deepseek-r1:8b"),
      createMockTask("3", "COMPLETED", "implementer", "qwen2.5-coder:7b"),
      createMockTask("4", "FAILED", "implementer", "deepseek-r1:8b"),
    ];

    const mockSource = {
      listRecent: async () => tasks,
    };

    const service = new RollingWindowAnalyticsService(mockSource);

    // Filter by role=implementer
    const roleMetrics = await service.computeRollingMetrics({
      windowSize: 10,
      filter: { role: "implementer" as any },
    });
    assert.equal(roleMetrics.sampleCount, 3);
    assert.equal(roleMetrics.successCount, 2);

    // Filter by model=deepseek-r1:8b
    const modelMetrics = await service.computeRollingMetrics({
      windowSize: 10,
      filter: { model: "deepseek-r1:8b" },
    });
    assert.equal(modelMetrics.sampleCount, 2);
    assert.equal(modelMetrics.failureCount, 2);
    assert.equal(modelMetrics.successRatePercent, 0.0);
  });
});
