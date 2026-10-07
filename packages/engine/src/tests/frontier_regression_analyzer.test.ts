import test from "node:test";
import assert from "node:assert/strict";
import { FrontierRegressionAnalyzer } from "../analytics/FrontierRegressionAnalyzer.js";
import type { IncidentBundle } from "../analytics/IncidentBundleRecorder.js";

test("FrontierRegressionAnalyzer Suite (T91.2.1 & T91.2.2)", async (t) => {
  const mockBundle: IncidentBundle = {
    bundleId: "incident-test-99",
    timestamp: new Date().toISOString(),
    alert: {
      alertId: "burst-99",
      windowSize: 10,
      totalTasksInWindow: 10,
      failureCount: 4,
      distinctModels: ["qwen2.5-coder:7b", "deepseek-r1:8b"],
      failingTasks: [
        { taskId: "t1", modelId: "qwen2.5-coder:7b", status: "FAILED", timestamp: 100, errorDetails: "error TS2339: Property 'ruleId' does not exist" },
        { taskId: "t2", modelId: "deepseek-r1:8b", status: "FAILED", timestamp: 200, errorDetails: "error TS2339: Property 'ruleId' does not exist" },
      ],
      timestamp: Date.now(),
      reason: "High failure density",
    },
    gitCommits: [
      { hash: "abcd1234ef567890", author: "Dev", date: "2026-10-07", message: "refactor: update RulePipelineEngine interfaces" },
      { hash: "1122334455667788", author: "Dev", date: "2026-10-07", message: "docs: update taskcade checklist" },
    ],
    failingTasks: [
      { taskId: "t1", modelId: "qwen2.5-coder:7b", status: "FAILED", timestamp: 100, errorDetails: "error TS2339: Property 'ruleId' does not exist" },
      { taskId: "t2", modelId: "deepseek-r1:8b", status: "FAILED", timestamp: 200, errorDetails: "error TS2339: Property 'ruleId' does not exist" },
    ],
    systemInfo: {
      nodeVersion: "v22.0.0",
      platform: "linux",
      arch: "x64",
      memoryUsage: {} as any,
      pid: 1234,
    },
  };

  await t.test("should classify TypeScript mismatch errors as ENGINE_REGRESSION and flag suspect commit", async () => {
    const analyzer = new FrontierRegressionAnalyzer();
    const result = await analyzer.analyze(mockBundle);

    assert.strictEqual(result.classification, "ENGINE_REGRESSION");
    assert.strictEqual(result.recommendedAction, "GIT_BISECT");
    assert.ok(result.suspectCommits.length > 0);
    assert.strictEqual(result.suspectCommits[0]?.hash, "abcd1234ef567890");
    assert.ok(result.suspectCommits[0]?.reason.includes("Modified core engine structures"));
  });

  await t.test("should generate reproducible git bisect script", () => {
    const analyzer = new FrontierRegressionAnalyzer();
    const analysis = analyzer.analyzeWithHeuristics(mockBundle);
    const script = analyzer.generateBisectScript(analysis);

    assert.ok(script.includes("git bisect start"));
    assert.ok(script.includes("git bisect bad abcd1234"));
    assert.ok(script.includes("git bisect run npm test"));
  });
});
