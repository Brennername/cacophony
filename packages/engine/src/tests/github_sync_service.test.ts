import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GitHubSyncService } from "../gitea/GitHubSyncService.js";
import type { MonorepoBuildGate, MonorepoBuildResult } from "../gitea/MonorepoBuildGate.js";

describe("T112.3: GitHubSyncService Unit Tests", () => {
  it("should handle sync when repository is up-to-date", async () => {
    const service = new GitHubSyncService({
      workspaceDir: process.cwd(),
      sourceRemote: "gitea",
      sourceBranch: "main",
      targetRemote: "origin",
      targetBranch: "master",
      verifyBuildBeforePush: false,
      dryRun: true,
    });

    const result = await service.sync();
    assert.equal(result.success, true);
    assert.ok(typeof result.pushed === "boolean");
    assert.ok(result.sourceSha.length > 0);
  });

  it("should abort push if verifyBuildBeforePush fails", async () => {
    const mockBuildGate = {
      verifyCleanBuild: async (): Promise<MonorepoBuildResult> => ({
        passed: false,
        exitCode: 1,
        durationMs: 120,
        diagnostics: [
          {
            code: "TS2304",
            message: "Cannot find name 'missingVar'.",
            file: "test.ts",
            line: 10,
          },
        ],
        stdout: "",
        stderr: "TS2304: Cannot find name 'missingVar'.",
        failureSummary: "Build failed with 1 diagnostic error",
      }),
    } as unknown as MonorepoBuildGate;

    const service = new GitHubSyncService({
      workspaceDir: process.cwd(),
      sourceRemote: "gitea",
      sourceBranch: "main",
      // Target an intentionally divergent ref so push logic is triggered
      targetRemote: "origin",
      targetBranch: "nonexistent-branch-for-divergence-test",
      verifyBuildBeforePush: true,
      buildGate: mockBuildGate,
    });

    const result = await service.sync();
    assert.equal(result.success, false);
    assert.equal(result.pushed, false);
    assert.equal(result.buildVerified, false);
    assert.ok(result.error?.includes("Build failed"));
  });

  it("should start and stop sync timer cleanly", () => {
    const service = new GitHubSyncService({
      intervalMs: 100_000,
    });

    assert.equal(service.isRunning(), false);
    service.start();
    assert.equal(service.isRunning(), true);
    service.stop();
    assert.equal(service.isRunning(), false);
  });
});
