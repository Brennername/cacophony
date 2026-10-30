import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { StructuredTestOutputParser } from "../testing/StructuredTestOutputParser.js";

describe("StructuredTestOutputParser Test Suite", () => {
  const parser = new StructuredTestOutputParser();

  describe("extractFailingTests", () => {
    it("should extract failing tests with correct file paths, assertions, and line numbers", () => {
      const sampleStderr = `
AssertionError [ERR_ASSERTION]: Expected 42 but got 0
    at Object.testCalculation (/workspace/packages/engine/src/tests/math.test.ts:42:12)
    at runTest (node:internal/test_runner/test:572:25)
      `;

      const result = parser.extractFailingTests(sampleStderr);
      assert.ok(result);
      assert.equal(result.filePaths.length, 2);
      assert.equal(result.filePaths[0], "/workspace/packages/engine/src/tests/math.test.ts");
      assert.equal(result.assertions[0], "Object.testCalculation");
      assert.equal(result.lineNumbers[0], 42);
    });

    it("should handle missing file paths and line numbers gracefully", () => {
      const malformedStderr = `
Generic error happened without stack trace details
    at <anonymous>
    at undefined
      `;

      const result = parser.extractFailingTests(malformedStderr);
      assert.ok(result);
      assert.equal(result.filePaths.length, 0);
      assert.equal(result.assertions.length, 0);
      assert.equal(result.lineNumbers.length, 0);

      const emptyResult = parser.extractFailingTests("");
      assert.equal(emptyResult.filePaths.length, 0);

      const undefinedResult = parser.extractFailingTests(undefined);
      assert.equal(undefinedResult.filePaths.length, 0);
    });

    it("should handle multiple failing tests with different file paths", () => {
      const multiStderr = `
AssertionError: value must not be null
    at checkAuth (/workspace/packages/engine/src/auth/guard.test.ts:18:5)
AssertionError: token expired
    at verifyExpiry (/workspace/packages/engine/src/auth/token.test.ts:95:10)
AssertionError: database connection refused
    at queryDb (/workspace/packages/db/src/tests/driver.test.ts:112:14)
      `;

      const result = parser.extractFailingTests(multiStderr);
      assert.equal(result.filePaths.length, 3);
      assert.equal(result.filePaths[0], "/workspace/packages/engine/src/auth/guard.test.ts");
      assert.equal(result.lineNumbers[0], 18);
      assert.equal(result.filePaths[1], "/workspace/packages/engine/src/auth/token.test.ts");
      assert.equal(result.lineNumbers[1], 95);
      assert.equal(result.filePaths[2], "/workspace/packages/db/src/tests/driver.test.ts");
      assert.equal(result.lineNumbers[2], 112);
    });

    it("should strip ANSI escape sequences before extracting stack locations", () => {
      const ansiStderr = `
\u001b[31mAssertionError: failed\u001b[39m
    at runWorker (\u001b[33m/app/src/worker.test.ts\u001b[39m:55:7)
      `;

      const result = parser.extractFailingTests(ansiStderr);
      assert.equal(result.filePaths.length, 1);
      assert.equal(result.filePaths[0], "/app/src/worker.test.ts");
      assert.equal(result.lineNumbers[0], 55);
    });
  });

  describe("extractCounters", () => {
    it("should extract pass/fail counters from Node.js test runner output", () => {
      const nodeOutput = `
ℹ tests 25
ℹ suites 4
ℹ pass 23
ℹ fail 2
ℹ cancelled 0
ℹ skipped 1
ℹ duration_ms 512.4
      `;

      const counters = parser.extractCounters(nodeOutput);
      assert.equal(counters.total, 25);
      assert.equal(counters.passed, 23);
      assert.equal(counters.failed, 2);
      assert.equal(counters.skipped, 1);
    });

    it("should extract pass/fail counters from Jest and Vitest output format", () => {
      const vitestOutput = `
Tests:  3 failed | 45 passed | 2 skipped (50 total)
Duration: 8.42s
      `;

      const counters = parser.extractCounters(vitestOutput);
      assert.equal(counters.total, 50);
      assert.equal(counters.passed, 45);
      assert.equal(counters.failed, 3);
      assert.equal(counters.skipped, 2);
    });

    it("should handle empty output when extracting counters", () => {
      const counters = parser.extractCounters("");
      assert.equal(counters.total, 0);
      assert.equal(counters.passed, 0);
      assert.equal(counters.failed, 0);
      assert.equal(counters.skipped, 0);
    });
  });

  describe("extractDuration", () => {
    it("should parse duration_ms from Node.js test runner", () => {
      const output = `ℹ duration_ms 104.06101`;
      const duration = parser.extractDuration(output);
      assert.equal(duration, 104.06101);
    });

    it("should parse seconds duration and convert to milliseconds for Vitest / Jest", () => {
      const output = `Duration 10.05s`;
      const duration = parser.extractDuration(output);
      assert.equal(duration, 10050);
    });

    it("should parse inline millisecond timings", () => {
      const output = ` ExecutionGuard tests passed (14.2ms)`;
      const duration = parser.extractDuration(output);
      assert.equal(duration, 14.2);
    });
  });

  describe("isolateFailureReasons", () => {
    it("should isolate failure reasons and deduplicate messages", () => {
      const output = `
AssertionError [ERR_ASSERTION]: Expected status 200 but got 500
    at /src/api.test.ts:10
TypeError: Cannot read properties of undefined (reading 'token')
    at /src/auth.test.ts:25
AssertionError [ERR_ASSERTION]: Expected status 200 but got 500
    at /src/api.test.ts:15
      `;

      const reasons = parser.isolateFailureReasons(output);
      assert.equal(reasons.length, 2);
      assert.ok(reasons.includes("AssertionError [ERR_ASSERTION]: Expected status 200 but got 500"));
      assert.ok(reasons.includes("TypeError: Cannot read properties of undefined (reading 'token')"));
    });
  });
});