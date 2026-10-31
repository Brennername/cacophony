import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ContextRecommender } from "../context/ContextRecommender.js";
import type { ExtractedSymbol } from "../repomap/SymbolExtractor.js";

describe("ContextRecommender", () => {
  const recommender = new ContextRecommender();

  test("should recommend corresponding test files for active editable files", () => {
    const activeFiles = ["packages/engine/src/auth/JwtValidator.ts"];
    const symbols: ExtractedSymbol[] = [];

    const recs = recommender.recommend(activeFiles, symbols);
    assert.ok(recs.length > 0);

    const testRec = recs.find((r) => r.reason === "corresponding_test");
    assert.ok(testRec);
    assert.equal(testRec.confidence, 0.95);
    assert.ok(
      testRec.filePath.includes("JwtValidator.test.ts") ||
        testRec.filePath.includes("JwtValidator.spec.ts"),
    );
  });

  test("should recommend imported dependencies from graph reference connections", () => {
    const activeFiles = ["packages/engine/src/scheduler/TaskPipeline.ts"];
    const symbols: ExtractedSymbol[] = [
      {
        id: "sym-1",
        name: "TaskPipeline",
        kind: "class",
        filePath: "packages/engine/src/scheduler/TaskPipeline.ts",
        lineStart: 10,
        lineEnd: 50,
        signature: "class TaskPipeline",
        references: ["ModelRegistry", "WorkerPool"],
      },
      {
        id: "sym-2",
        name: "ModelRegistry",
        kind: "class",
        filePath: "packages/engine/src/models/ModelRegistry.ts",
        lineStart: 5,
        lineEnd: 30,
        signature: "class ModelRegistry",
        references: [],
      },
      {
        id: "sym-3",
        name: "WorkerPool",
        kind: "class",
        filePath: "packages/engine/src/workers/WorkerPool.ts",
        lineStart: 8,
        lineEnd: 40,
        signature: "class WorkerPool",
        references: [],
      },
    ];

    const recs = recommender.recommend(activeFiles, symbols);
    const dependencyRecs = recs.filter((r) => r.reason === "imported_dependency");
    assert.equal(dependencyRecs.length, 2);
    assert.equal(dependencyRecs[0]!.confidence, 0.8);
    assert.ok(dependencyRecs.some((r) => r.filePath.includes("ModelRegistry.ts")));
    assert.ok(dependencyRecs.some((r) => r.filePath.includes("WorkerPool.ts")));
  });

  test("should recommend files based on user prompt keyword match", () => {
    const activeFiles = ["packages/engine/src/main.ts"];
    const symbols: ExtractedSymbol[] = [
      {
        id: "sym-4",
        name: "TelemetryStore",
        kind: "class",
        filePath: "packages/engine/src/telemetry/TelemetryStore.ts",
        lineStart: 1,
        lineEnd: 25,
        signature: "class TelemetryStore",
        references: [],
      },
      {
        id: "sym-5",
        name: "GitCheckpointManager",
        kind: "class",
        filePath: "packages/engine/src/git/GitCheckpointManager.ts",
        lineStart: 1,
        lineEnd: 35,
        signature: "class GitCheckpointManager",
        references: [],
      },
    ];

    const prompt = "Please check the TelemetryStore metrics aggregation logic";
    const recs = recommender.recommend(activeFiles, symbols, prompt);

    const promptRec = recs.find((r) => r.reason === "prompt_relevance");
    assert.ok(promptRec);
    assert.equal(promptRec.filePath, "packages/engine/src/telemetry/TelemetryStore.ts");
    assert.equal(promptRec.confidence, 0.75);
  });

  test("should sort recommendations in descending order of confidence", () => {
    const activeFiles = ["src/feature.ts"];
    const symbols: ExtractedSymbol[] = [
      {
        id: "sym-6",
        name: "Feature",
        kind: "class",
        filePath: "src/feature.ts",
        lineStart: 1,
        lineEnd: 20,
        signature: "class Feature",
        references: ["Dep"],
      },
      {
        id: "sym-7",
        name: "Dep",
        kind: "class",
        filePath: "src/dep.ts",
        lineStart: 1,
        lineEnd: 20,
        signature: "class Dep",
        references: [],
      },
      {
        id: "sym-8",
        name: "KeywordTarget",
        kind: "class",
        filePath: "src/keyword.ts",
        lineStart: 1,
        lineEnd: 20,
        signature: "class KeywordTarget",
        references: [],
      },
    ];

    const recs = recommender.recommend(activeFiles, symbols, "KeywordTarget query");
    for (let i = 0; i < recs.length - 1; i++) {
      assert.ok(recs[i]!.confidence >= recs[i + 1]!.confidence);
    }
  });
});
