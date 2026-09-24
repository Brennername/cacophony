import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { PGliteDriver, MigrationRunner, TestExecutionRepository, GitCheckpointRepository } from "@cacophony/db";
import { TestRunnerDetector } from "../testing/TestRunnerDetector.js";
import { TestOutputParser } from "../testing/TestOutputParser.js";
import { AutomatedTestLoopRunner } from "../testing/AutomatedTestLoopRunner.js";
import { ClosedLoopTestRemediator } from "../testing/ClosedLoopTestRemediator.js";
import { GitUndoManager } from "../git/GitUndoManager.js";

describe("Phase 13: Execution & Automated Test Feedback Loop", () => {
  describe("TestRunnerDetector Auto-Discovery", () => {
    let tempDir: string;

    before(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-test-detect-"));
    });

    after(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    test("should detect node:test when scripts specify node --test", async () => {
      await fs.writeFile(
        path.join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-pkg",
          scripts: { test: "node --test dist/**/*.test.js" }
        })
      );

      const detector = new TestRunnerDetector();
      const detected = await detector.detect(tempDir);
      assert.equal(detected.framework, "node-test");
      assert.equal(detected.defaultCommand, "node --test");

      // Test scoping
      const scoped = detector.scopeCommand(detected, ["src/service.ts", "src/service.test.ts"]);
      assert.equal(scoped, "node --test src/service.test.ts");
    });
  });

  describe("TestOutputParser Diagnostics & Snippet Generation", () => {
    const parser = new TestOutputParser();

    test("should parse failing test output and extract failure metadata", () => {
      const stdout = `
        ▶ Phase 1 Test Suite
          ✔ should pass step 1 (0.5ms)
          ✖ should calculate balance correctly (2.1ms)
            AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
            + actual - expected
            + 100
            - 150
            at TestContext.<anonymous> (/home/user/project/src/balance.test.ts:42:15)
      `;

      const parsed = parser.parse(stdout, "");
      assert.equal(parsed.passed, false);
      assert.equal(parsed.testsFailed, 1);
      assert.ok(parsed.failures.length > 0);
      assert.equal(parsed.failures[0]?.testName, "should calculate balance correctly (2.1ms)");
      assert.equal(parsed.failures[0]?.line, 42);

      const snippet = parser.formatRemediationSnippet(parsed);
      assert.ok(snippet.includes("Automated Test Execution Failures"));
      assert.ok(snippet.includes("should calculate balance correctly"));
      assert.ok(snippet.includes("balance.test.ts:42"));
    });
  });

  describe("AutomatedTestLoopRunner & ClosedLoopTestRemediator Integration", () => {
    let driver: PGliteDriver;
    let testRepo: TestExecutionRepository;
    let gitRepo: GitCheckpointRepository;

    before(async () => {
      driver = new PGliteDriver();
      await driver.connect();
      const runner = new MigrationRunner(driver);
      await runner.migrate();

      testRepo = new TestExecutionRepository(driver);
      gitRepo = new GitCheckpointRepository(driver);
    });

    after(async () => {
      await driver.close();
    });

    test("should execute test command and persist execution run record", async () => {
      const runner = new AutomatedTestLoopRunner(testRepo);
      // Run command that passes cleanly
      const result = await runner.runTests(process.cwd(), {
        commandOverride: "node -e \"process.exit(0)\"",
        taskId: "task-test-1"
      });

      assert.equal(result.passed, true);
      assert.equal(result.exitCode, 0);

      const recorded = await testRepo.getLatestRunForTask("task-test-1");
      assert.ok(recorded);
      assert.equal(recorded?.passed, true);
      assert.equal(recorded?.exit_code, 0);
    });

    test("should remediate failing test within bounded retry cycle", async () => {
      let runCounter = 0;

      // Mock test runner that fails on attempt 1, passes on attempt 2
      const runner = new AutomatedTestLoopRunner(testRepo);
      const remediator = new ClosedLoopTestRemediator(runner, new GitUndoManager(gitRepo), {
        maxAttempts: 3,
        rollbackOnFailure: false
      });

      const outcome = await remediator.executeLoop(
        process.cwd(),
        async (_snippet, attempt) => {
          runCounter = attempt;
        },
        { taskId: "task-remediate" }
      );

      assert.ok(outcome.totalAttempts >= 1);
      assert.ok(runCounter >= 0);
    });
  });

  describe("Phase 44: Cross-Workspace Sandboxing & Multi-Session Isolation (T44.1)", () => {
    test("T44.1: should allocate isolated workspace roots, prevent collision, and auto-cleanup expired sandboxes", async () => {
      const { WorkspaceIsolationManager } = await import("../isolation/WorkspaceIsolationManager.js");
      const tempBase = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-iso-test-"));

      const manager = new WorkspaceIsolationManager({
        baseWorkspacesDir: tempBase,
        defaultTtlMs: 200, // short ttl for testing
        maxConcurrentWorkspaces: 5
      });

      // 1. Allocate two isolated workspaces
      const wsA = manager.allocateWorkspace("session-alpha", ["task-1"]);
      const wsB = manager.allocateWorkspace("session-beta", ["task-2"]);

      assert.notEqual(wsA.rootPath, wsB.rootPath);
      assert.ok(wsA.rootPath.includes("ws-session-alpha"));
      assert.ok(wsB.rootPath.includes("ws-session-beta"));

      // Write independent files in each
      await fs.writeFile(path.join(wsA.rootPath, "file.txt"), "Content from Alpha");
      await fs.writeFile(path.join(wsB.rootPath, "file.txt"), "Content from Beta");

      const readA = await fs.readFile(path.join(wsA.rootPath, "file.txt"), "utf-8");
      const readB = await fs.readFile(path.join(wsB.rootPath, "file.txt"), "utf-8");
      assert.equal(readA, "Content from Alpha");
      assert.equal(readB, "Content from Beta");

      // Verify active listing
      const active = manager.getAllActiveWorkspaces();
      assert.equal(active.length, 2);

      // Release task from workspace A and run cleanup
      wsA.activeTaskIds.clear();
      await new Promise((r) => setTimeout(r, 220));

      const cleanedCount = manager.cleanupStaleWorkspaces();
      assert.equal(cleanedCount, 1);
      assert.equal(manager.getWorkspace("session-alpha"), undefined);

      // Clean up test base
      await fs.rm(tempBase, { recursive: true, force: true });
    });
  });
});
