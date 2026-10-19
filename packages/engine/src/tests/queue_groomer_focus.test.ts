import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { TaskRecord } from "@cacophony/shared-types";
import { QueueGroomer } from "../scheduler/QueueGroomer.js";

describe("QueueGroomer Focus Files & Role Target Selection Suite", () => {
  const groomer = new QueueGroomer();

  const createBaseTask = (overrides: Partial<TaskRecord>): TaskRecord => ({
    id: "taskcade-test-1",
    title: "Test task",
    prompt: "Sample test prompt",
    role: "implementer",
    status: "PENDING",
    priority: "P1",
    modelAssigned: null,
    testCommand: null,
    focusFiles: null,
    targetBranch: null,
    prUrl: null,
    failureCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    ...overrides,
  });

  it("should cleanly split comma-delimited focusFiles and trim trailing punctuation", () => {
    const task = createBaseTask({
      focusFiles:
        "packages/engine/src/telemetry/ThermalGovernor.ts, packages/engine/src/tests/thermal_governor.test.ts",
      role: "implementer",
    });

    const groomed = groomer.groom(task);

    // Primary target for implementer should be the implementation file without any trailing comma
    assert.strictEqual(
      groomed.focusFiles[0],
      "packages/engine/src/telemetry/ThermalGovernor.ts",
    );
    assert.strictEqual(groomed.focusFiles[0]?.includes(","), false);
  });

  it("should select the test file when task role is test_engineer", () => {
    const task = createBaseTask({
      title: "Write unit tests verifying ThermalGovernor",
      prompt:
        "Write unit tests verifying ThermalGovernor throttling state transitions",
      focusFiles:
        "packages/engine/src/telemetry/ThermalGovernor.ts, packages/engine/src/tests/thermal_governor.test.ts",
      role: "test_engineer",
    });

    const groomed = groomer.groom(task);

    // When role is test_engineer, target should be the unit test file
    assert.strictEqual(
      groomed.focusFiles[0],
      "packages/engine/src/tests/thermal_governor.test.ts",
    );
    // Implementation file must be preserved for context assembly
    assert.strictEqual(
      groomed.focusFiles[1],
      "packages/engine/src/telemetry/ThermalGovernor.ts",
    );
  });

  it("should select the test file when prompt explicitly requests unit tests", () => {
    const task = createBaseTask({
      title: "T102.2.1: Write unit tests verifying AmdVegaTelemetryProvider",
      prompt:
        "[TASK OBJECTIVE]: T102.2.1: Write unit tests verifying AmdVegaTelemetryProvider sysfs discovery",
      focusFiles:
        "packages/engine/src/telemetry/AmdVegaTelemetryProvider.ts, packages/engine/src/tests/amd_vega_telemetry.test.ts",
      role: "implementer", // role might be implementer but prompt indicates unit test
    });

    const groomed = groomer.groom(task);

    // Prompt indicates unit test verification, so the test target must be prioritized
    assert.strictEqual(
      groomed.focusFiles[0],
      "packages/engine/src/tests/amd_vega_telemetry.test.ts",
    );
  });

  it("should handle semicolon and quote delimiters in focusFiles", () => {
    const task = createBaseTask({
      focusFiles:
        '"packages/engine/src/daemon/RateLimiter.ts"; "packages/engine/src/tests/rate_limiter.test.ts"',
      role: "implementer",
    });

    const groomed = groomer.groom(task);

    assert.strictEqual(
      groomed.focusFiles[0],
      "packages/engine/src/daemon/RateLimiter.ts",
    );
    assert.strictEqual(groomed.focusFiles[0]?.includes(";"), false);
    assert.strictEqual(groomed.focusFiles[0]?.includes('"'), false);
  });
});
