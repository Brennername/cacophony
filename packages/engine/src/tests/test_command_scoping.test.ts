import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { TaskRecord, AgentRole, TaskPriority } from "@cacophony/shared-types";
import { QueueGroomer } from "../scheduler/QueueGroomer.js";

/**
 * Validates that QueueGroomer precisely scopes test commands to individual test files
 * rather than inflating them to broad workspace test runners, preventing execution timeouts.
 */
describe("QueueGroomer Test Command Scoping Regression Tests", () => {
  const groomer = new QueueGroomer();

  const createTask = (
    id: string,
    testCommand: string | null,
    focusFiles: string | null,
    title = "Test task",
  ): TaskRecord => ({
    id,
    title,
    prompt: `Execute ${title}`,
    role: "implementer" as AgentRole,
    status: "PENDING",
    priority: "P1" as TaskPriority,
    modelAssigned: "qwen2.5-coder:7b",
    testCommand,
    focusFiles,
    targetBranch: "master",
    prUrl: null,
    failureCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  });

  it("preserves compiled JavaScript test targets directly without expanding to workspace", () => {
    const task = createTask(
      "task-compiled-test",
      "npm test -- packages/engine/dist/tests/sensors_parser.test.js",
      "packages/engine/src/telemetry/SensorsParser.ts",
    );

    const groomed = groomer.groom(task);
    assert.equal(
      groomed.scopedTestCommand,
      "node --test --test-concurrency=1 packages/engine/dist/tests/sensors_parser.test.js",
      "Compiled test paths must run directly with node --test rather than running the full workspace suite",
    );
  });

  it("maps TypeScript test file targets directly to their compiled JavaScript dist equivalents", () => {
    const task = createTask(
      "task-ts-test",
      "npm test -- packages/engine/src/tests/sensors_parser.test.ts",
      "packages/engine/src/telemetry/SensorsParser.ts",
    );

    const groomed = groomer.groom(task);
    assert.equal(
      groomed.scopedTestCommand,
      "node --test --test-concurrency=1 packages/engine/dist/tests/sensors_parser.test.js",
      "TypeScript test file paths must map directly to compiled dist/*.test.js",
    );
  });

  it("scopes focusFiles pointing directly to a test file directly to node --test", () => {
    const task = createTask(
      "task-focus-test",
      null,
      "packages/engine/src/tests/sensors_parser.test.ts",
    );

    const groomed = groomer.groom(task);
    assert.equal(
      groomed.scopedTestCommand,
      "node --test --test-concurrency=1 packages/engine/dist/tests/sensors_parser.test.js",
      "Focus files that are test files must resolve directly to node --test for that specific suite",
    );
  });

  it("discovers companion test files for PascalCase source files", () => {
    const task = createTask(
      "task-source-companion",
      null,
      "packages/engine/src/telemetry/SensorsParser.ts",
    );

    const groomed = groomer.groom(task);
    assert.equal(
      groomed.scopedTestCommand,
      "node --test --test-concurrency=1 packages/engine/dist/tests/sensors_parser.test.js",
      "Source files with matching snake_case test files must resolve directly to that specific test",
    );
  });

  it("scopes directory targets without explicit files to workspace runners", () => {
    const task = createTask(
      "task-dir-test",
      "npm test -- packages/db",
      "packages/db/src/index.ts",
    );

    const groomed = groomer.groom(task);
    assert.equal(
      groomed.scopedTestCommand,
      "npm run test --workspace=@cacophony/db",
      "Directory-level packages should scope to workspace test commands",
    );
  });
});
