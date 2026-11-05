import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { TestExecutionRepository, type TestExecutionRecord } from "../repositories/TestExecutionRepository.js";

describe("TestExecutionRepository", () => {
  let driver: PGliteDriver;
  let repo: TestExecutionRepository;

  beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    repo = new TestExecutionRepository(driver);
  });

  afterEach(async () => {
    await driver.close();
  });

  test("should record test execution run and retrieve latest run for task", async () => {
    const run1: Omit<TestExecutionRecord, "created_at"> = {
      id: "run_001",
      task_id: "task_100",
      session_id: "session_abc",
      test_framework: "vitest",
      test_command: "npm test",
      scoped_files_json: JSON.stringify(["src/auth.test.ts"]),
      exit_code: 1,
      passed: false,
      duration_ms: 1250,
      stdout: "Tests failed: 1 failure",
      stderr: "AssertionError: expected true to be false",
      failed_assertions_json: JSON.stringify([{ test: "auth flow", error: "bad password" }]),
      root_causes_json: JSON.stringify(["AuthValidator mismatch"]),
      remediation_attempt: 1,
    };

    await repo.recordRun(run1);

    const latest = await repo.getLatestRunForTask("task_100");
    assert.ok(latest);
    assert.equal(latest.id, "run_001");
    assert.equal(latest.task_id, "task_100");
    assert.equal(latest.test_framework, "vitest");
    assert.equal(latest.passed, false);
    assert.equal(latest.exit_code, 1);
    assert.equal(latest.duration_ms, 1250);
  });

  test("should return newer run when multiple runs exist for the same task", async () => {
    const run1: Omit<TestExecutionRecord, "created_at"> = {
      id: "run_early",
      task_id: "task_multi",
      session_id: null,
      test_framework: "node:test",
      test_command: "node --test",
      scoped_files_json: "[]",
      exit_code: 1,
      passed: false,
      duration_ms: 500,
      stdout: "",
      stderr: "Error",
      failed_assertions_json: "[]",
      root_causes_json: "[]",
      remediation_attempt: 1,
    };

    const run2: Omit<TestExecutionRecord, "created_at"> = {
      id: "run_remediated",
      task_id: "task_multi",
      session_id: null,
      test_framework: "node:test",
      test_command: "node --test",
      scoped_files_json: "[]",
      exit_code: 0,
      passed: true,
      duration_ms: 450,
      stdout: "All tests passed",
      stderr: "",
      failed_assertions_json: "[]",
      root_causes_json: "[]",
      remediation_attempt: 2,
    };

    await repo.recordRun(run1);

    await new Promise((resolve) => setTimeout(resolve, 15));
    await repo.recordRun(run2);

    const latest = await repo.getLatestRunForTask("task_multi");
    assert.ok(latest);
    assert.equal(latest.id, "run_remediated");
    assert.equal(latest.passed, true);
    assert.equal(latest.remediation_attempt, 2);
  });

  test("should list runs with optional task ID filter and limit", async () => {
    await repo.recordRun({
      id: "run_a",
      task_id: "task_alpha",
      session_id: null,
      test_framework: "jest",
      test_command: "jest",
      scoped_files_json: "[]",
      exit_code: 0,
      passed: true,
      duration_ms: 100,
      stdout: "",
      stderr: "",
      failed_assertions_json: "[]",
      root_causes_json: "[]",
      remediation_attempt: 0,
    });

    await repo.recordRun({
      id: "run_b",
      task_id: "task_beta",
      session_id: null,
      test_framework: "jest",
      test_command: "jest",
      scoped_files_json: "[]",
      exit_code: 0,
      passed: true,
      duration_ms: 120,
      stdout: "",
      stderr: "",
      failed_assertions_json: "[]",
      root_causes_json: "[]",
      remediation_attempt: 0,
    });

    const allRuns = await repo.listRuns(undefined, 10);
    assert.equal(allRuns.length, 2);

    const alphaRuns = await repo.listRuns("task_alpha", 10);
    assert.equal(alphaRuns.length, 1);
    assert.equal(alphaRuns[0]!.id, "run_a");
  });
});
