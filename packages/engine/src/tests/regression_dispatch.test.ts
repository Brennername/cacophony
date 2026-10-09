import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { TaskRecord } from "@cacophony/shared-types";
import { GitRegressionCorrelator } from "../analytics/GitRegressionCorrelator.js";
import { RegressionDispatchSupervisor } from "../scheduler/RegressionDispatchSupervisor.js";

describe("RegressionDispatchSupervisor Suite (T85.3)", () => {
  const createMockTask = (id: string, status: "COMPLETED" | "FAILED", focusFiles = "src/app.ts"): TaskRecord => ({
    id,
    title: `Task ${id}`,
    prompt: `Prompt for ${id}`,
    role: "implementer",
    status,
    priority: "P1",
    modelAssigned: "qwen2.5-coder:7b",
    testCommand: "npm test",
    focusFiles,
    targetBranch: null,
    prUrl: null,
    failureCount: status === "FAILED" ? 1 : 0,
    createdAt: new Date(Date.now() - 60000).toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });

  it("correlates task failure with culprit commit via focus files", () => {
    const commits = [
      {
        hash: "c111111111111111111111111111111111111111",
        author: "Dev",
        timestamp: Date.now() - 10000,
        subject: "fix: update core engine",
      },
      {
        hash: "c222222222222222222222222222222222222222",
        author: "Dev",
        timestamp: Date.now() - 50000,
        subject: "feat: change app bootstrap",
      },
    ];

    const correlator = new GitRegressionCorrelator("/tmp", (cmd: string) => {
      if (cmd.includes("c2222222")) return "src/app.ts\nsrc/index.ts";
      return "src/other.ts";
    });

    const failed = createMockTask("task-f1", "FAILED", "src/app.ts");
    const result = correlator.correlateFailure(failed, commits);

    assert.equal(result.confidenceScore, 0.9);
    assert.equal(result.culpritCommit?.hash, "c222222222222222222222222222222222222222");
    assert(result.matchedFiles.includes("src/app.ts"));
  });

  it("triggers diagnostic task creation on consecutive failure streak", async () => {
    const createdTasks: TaskRecord[] = [];
    const mockRepo = {
      create: async (t: TaskRecord) => {
        createdTasks.push(t);
        return t;
      },
      listRecent: async () => [],
    };

    const supervisor = new RegressionDispatchSupervisor(mockRepo, undefined, {
      consecutiveFailuresTrigger: 3,
    });

    const tasks: TaskRecord[] = [
      createMockTask("1", "FAILED"),
      createMockTask("2", "FAILED"),
      createMockTask("3", "FAILED"),
      createMockTask("4", "COMPLETED"),
    ];

    const health = await supervisor.evaluateQueueHealth(tasks);
    assert.equal(health.isTriggered, true);
    assert.equal(health.consecutiveFailures, 3);
    assert.equal(createdTasks.length, 1);
    assert.equal(createdTasks[0]?.priority, "P0");
    assert(createdTasks[0]?.title.includes("[P0 Triage]"));
  });

  it("triggers plateau intervention when performance stagnates", async () => {
    const createdTasks: TaskRecord[] = [];
    const mockRepo = {
      create: async (t: TaskRecord) => {
        createdTasks.push(t);
        return t;
      },
      listRecent: async () => [],
    };

    const supervisor = new RegressionDispatchSupervisor(mockRepo);

    const plateauMetrics = {
      windowSize: 50,
      sampleCount: 50,
      successCount: 40,
      failureCount: 10,
      successRatePercent: 80.0,
      velocityDelta: 0.1,
      accelerationDelta: 0.0,
      isPlateaued: true,
      filteredBy: {},
    };

    const intervention = await supervisor.triggerPlateauIntervention(plateauMetrics);
    assert(intervention !== null);
    assert.equal(intervention?.priority, "P0");
    assert(intervention?.title.includes("[P0 Architecture] Plateau Intervention"));
    assert.equal(createdTasks.length, 1);
  });
});
