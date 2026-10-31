import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FailureClassifier,
  ExecutionTimeoutError,
} from "../analytics/FailureClassifier.js";

describe("FailureClassifier Test Suite", () => {
  describe("Pattern Matching and Category Classification", () => {
    it("should classify ExecutionTimeoutError instance as TIMEOUT with confidence 1.0", () => {
      const error = new ExecutionTimeoutError("Task execution timed out after 30000ms", 30000);
      const result = FailureClassifier.classify(error);

      assert.strictEqual(result.category, "TIMEOUT");
      assert.strictEqual(result.confidence, 1.0);
      assert.strictEqual(result.matchedPattern, "execution_timeout_error");
    });

    it("should classify exitCode 124 or timeout keywords as TIMEOUT", () => {
      const exitCodeResult = FailureClassifier.classify("Command failed", { exitCode: 124 });
      assert.strictEqual(exitCodeResult.category, "TIMEOUT");

      const watchdogResult = FailureClassifier.classify("Execution aborted by watchdog timer after 180s");
      assert.strictEqual(watchdogResult.category, "TIMEOUT");
    });

    it("should classify thermal throttling errors as THERMAL_THROTTLE", () => {
      const result = FailureClassifier.classify("Warning: GPU temp exceeded 85C danger zone, thermal throttle active");
      assert.strictEqual(result.category, "THERMAL_THROTTLE");
      assert.strictEqual(result.confidence, 0.95);
    });

    it("should classify context window overflow and VRAM exhaustion as CONTEXT_OVERFLOW", () => {
      const tokenResult = FailureClassifier.classify("Error: token window size limit exceeded for prompt generation");
      assert.strictEqual(tokenResult.category, "CONTEXT_OVERFLOW");

      const vramResult = FailureClassifier.classify("FATAL: vram exhausted during model weight allocation");
      assert.strictEqual(vramResult.category, "CONTEXT_OVERFLOW");
    });

    it("should classify missing module imports as MISSING_DEPENDENCY", () => {
      const result = FailureClassifier.classify("Error: Cannot find module '@angular/core/testing' from spec");
      assert.strictEqual(result.category, "MISSING_DEPENDENCY");
      assert.strictEqual(result.confidence, 0.95);
      assert.ok(result.rootCauseSnippet?.includes("Cannot find module"));
    });

    it("should classify banned import and guardrail errors as BANNED_IMPORT", () => {
      const result = FailureClassifier.classify("Security guardrail rejected unsafe dependency: banned import detected");
      assert.strictEqual(result.category, "BANNED_IMPORT");
      assert.strictEqual(result.confidence, 0.95);
    });

    it("should classify TypeScript compiler diagnostics as TYPE_MISMATCH", () => {
      const result = FailureClassifier.classify(
        "src/auth/jwt.ts:42:15 - error TS2322: Type 'string' is not assignable to type 'number'.",
      );
      assert.strictEqual(result.category, "TYPE_MISMATCH");
      assert.strictEqual(result.confidence, 0.9);
      assert.ok(result.rootCauseSnippet?.includes("error TS2322"));
    });

    it("should classify syntax errors as SYNTAX_ERROR", () => {
      const result = FailureClassifier.classify("SyntaxError: Unexpected token '}' at JSON.parse");
      assert.strictEqual(result.category, "SYNTAX_ERROR");
      assert.strictEqual(result.confidence, 0.95);
      assert.ok(result.rootCauseSnippet?.includes("SyntaxError: Unexpected token"));
    });

    it("should classify test assertion failures as ASSERTION_FAILURE", () => {
      const result = FailureClassifier.classify(
        "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: true !== false",
      );
      assert.strictEqual(result.category, "ASSERTION_FAILURE");
      assert.strictEqual(result.confidence, 0.9);
    });

    it("should classify unmapped errors as UNKNOWN with confidence 0.5", () => {
      const result = FailureClassifier.classify("Something arbitrary happened in the subsystem");
      assert.strictEqual(result.category, "UNKNOWN");
      assert.strictEqual(result.confidence, 0.5);
    });
  });

  describe("Stack Trace Location Extraction", () => {
    it("should extract Node.js stack trace locations while skipping internal modules", () => {
      const stack = `
Error: Test failed
    at TestContext.<anonymous> (file:///home/user/project/src/service.ts:42:15)
    at async Test.run (node:internal/test_runner/test:1054:7)
    at process.runNodeModules (/home/user/project/node_modules/lib/index.js:12:3)
      `;

      const locations = FailureClassifier.extractStackLocations(stack);
      assert.strictEqual(locations.length, 1);
      assert.strictEqual(locations[0]?.file, "/home/user/project/src/service.ts");
      assert.strictEqual(locations[0]?.line, 42);
      assert.strictEqual(locations[0]?.column, 15);
    });

    it("should extract Rust cargo error locations", () => {
      const cargoLog = `
error[E0308]: mismatched types
 --> src/main.rs:18:24
   |
18 |     let x: u32 = "hello";
   |                  ^^^^^^^ expected \`u32\`, found \`&str\`
      `;

      const locations = FailureClassifier.extractStackLocations(cargoLog);
      assert.strictEqual(locations.length, 1);
      assert.strictEqual(locations[0]?.file, "src/main.rs");
      assert.strictEqual(locations[0]?.line, 18);
      assert.strictEqual(locations[0]?.column, 24);
    });

    it("should extract Java Maven compiler error locations", () => {
      const mavenLog = `
[ERROR] /home/user/repo/src/main/java/App.java:[35,12] cannot find symbol
      `;

      const locations = FailureClassifier.extractStackLocations(mavenLog);
      assert.strictEqual(locations.length, 1);
      assert.strictEqual(locations[0]?.file, "/home/user/repo/src/main/java/App.java");
      assert.strictEqual(locations[0]?.line, 35);
      assert.strictEqual(locations[0]?.column, 12);
      assert.strictEqual(locations[0]?.message, "cannot find symbol");
    });
  });
});
