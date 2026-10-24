import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TaskComplexityEstimator } from "../scheduler/TaskComplexityEstimator.js";

describe("TaskComplexityEstimator Unit Tests (T-S4.1)", () => {
  const estimator = new TaskComplexityEstimator();

  it("should mark simple, single-file tasks as not needing decomposition", () => {
    const result = estimator.estimateComplexity({
      taskId: "task-simple-1",
      title: "Fix typo in log message",
      prompt: "Change 'recieved' to 'received' in logger.",
      focusFiles: ["src/logger.ts"],
      modelTimeoutMs: 300_000, // 5 min window (threshold 180s)
    });

    assert.equal(result.shouldDecompose, false);
    assert.equal(result.microSubtasks.length, 0);
    assert.ok(result.estimatedDurationMs < result.timeoutThresholdMs);
  });

  it("should decompose complex multi-file migration tasks exceeding 60% of timeout window", () => {
    const longPrompt = "Refactor database migration system to support distributed SQLite replicas.\n".repeat(40);
    const result = estimator.estimateComplexity({
      taskId: "task-heavy-1",
      title: "Distributed SQLite Migration System",
      prompt: longPrompt,
      focusFiles: [
        "packages/db/src/drivers/SQLiteDriver.ts",
        "packages/db/src/migrations/MigrationRunner.ts",
        "packages/db/src/migrations/MigrationRegistry.ts",
        "packages/db/src/services/DatabaseBackupService.ts",
        "packages/engine/src/daemon/CacophonyDaemon.ts",
      ],
      modelTimeoutMs: 420_000, // Gemma timeout window (threshold 252s)
    });

    assert.equal(result.shouldDecompose, true);
    assert.equal(result.microSubtasks.length, 2);

    const subtask1 = result.microSubtasks[0];
    const subtask2 = result.microSubtasks[1];
    assert.ok(subtask1, "subtask 1 must be defined");
    assert.ok(subtask2, "subtask 2 must be defined");

    assert.equal(subtask1.stage, "scaffolding");
    assert.ok(subtask1.title.includes("Stage 1: Contracts and Scaffolding"));
    assert.ok(subtask1.prompt.includes("type definitions"));

    assert.equal(subtask2.stage, "implementation");
    assert.ok(subtask2.title.includes("Stage 2: Implementation and Verification"));
    assert.ok(subtask2.prompt.includes("functional logic"));

    // Total subtask duration should match estimated duration
    assert.ok(subtask1.estimatedDurationMs + subtask2.estimatedDurationMs <= result.estimatedDurationMs);
  });
});
