import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SandboxedProcessRunner } from "../SandboxedProcessRunner.js";
import { FailureClassifier, type ClassificationResult } from "../../analytics/FailureClassifier.js";
import { ClosedLoopTestRemediator } from "../ClosedLoopTestRemediator.js";

describe("Phase 38: Automated Test Runner Guardrails, Process Sandboxing & Failure Taxonomy", () => {
  it("T38.1: SandboxedProcessRunner executes command and captures stdout/stderr with duration", async () => {
    const runner = new SandboxedProcessRunner();
    const result = await runner.run('node -e "console.log(\'sandbox ok\'); process.exit(0);"', {
      cwd: process.cwd(),
      timeoutMs: 5000,
      maxBufferBytes: 1024
    });

    assert.equal(result.exitCode, 0);
    assert.equal(result.timedOut, false);
    assert.ok(result.stdout.includes("sandbox ok"));
    assert.ok(result.durationMs >= 0);
  });

  it("T38.1: SandboxedProcessRunner terminates on timeout and returns exitCode 124", async () => {
    const runner = new SandboxedProcessRunner();
    const result = await runner.run('node -e "setTimeout(() => {}, 10000);"', {
      cwd: process.cwd(),
      timeoutMs: 300,
      maxBufferBytes: 1024
    });

    assert.equal(result.timedOut, true);
    assert.equal(result.exitCode, 124);
    assert.ok(result.stderr.includes("timed out"));
  });

  it("T38.1: SandboxedProcessRunner enforces buffer size limits to prevent memory bloat", async () => {
    const runner = new SandboxedProcessRunner();
    const result = await runner.run('node -e "for(let i=0; i<100; i++) console.log(\'A\'.repeat(50));"', {
      cwd: process.cwd(),
      timeoutMs: 5000,
      maxBufferBytes: 256
    });

    assert.equal(result.truncated, true);
    assert.ok(result.stdout.includes("[OUTPUT TRUNCATED: Exceeded maximum log buffer limit]"));
  });

  it("T38.2: FailureClassifier accurately categorizes diverse compiler & test failures", () => {
    const syntaxErr = FailureClassifier.classify("SyntaxError: Unexpected identifier 'foo'");
    assert.equal(syntaxErr.category, "SYNTAX_ERROR");
    assert.ok(syntaxErr.confidence >= 0.9);

    const typeErr = FailureClassifier.classify("error TS2322: Type 'string' is not assignable to type 'number'.");
    assert.equal(typeErr.category, "TYPE_MISMATCH");

    const missingDep = FailureClassifier.classify("Error: Cannot find module '@cacophony/nonexistent'");
    assert.equal(missingDep.category, "MISSING_DEPENDENCY");

    const timeoutErr = FailureClassifier.classify("Command failed with timeout after 60000ms", { exitCode: 124 });
    assert.equal(timeoutErr.category, "TIMEOUT");

    const assertionErr = FailureClassifier.classify("AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n+ 1\n- 2");
    assert.equal(assertionErr.category, "ASSERTION_FAILURE");
  });

  it("T38.2: FailureClassifier extracts specific failure line numbers and stack traces across toolchains", () => {
    // Vitest/Jest
    const jsTrace = `
      Error: test failure
        at Object.<anonymous> (/app/packages/engine/src/foo.ts:42:15)
        at runTest (/app/packages/engine/src/bar.ts:88:5)
    `;
    const jsLocs = FailureClassifier.extractStackLocations(jsTrace);
    assert.ok(jsLocs.length >= 2);
    assert.equal(jsLocs[0]?.line, 42);
    assert.ok(jsLocs[0]?.file.includes("foo.ts"));

    // Cargo test
    const rustTrace = `
      error[E0308]: mismatched types
       --> src/scheduler.rs:104:18
        |
    104 |         let x: u32 = "hello";
    `;
    const rustLocs = FailureClassifier.extractStackLocations(rustTrace);
    assert.ok(rustLocs.length >= 1);
    assert.equal(rustLocs[0]?.file, "src/scheduler.rs");
    assert.equal(rustLocs[0]?.line, 104);

    // Go test
    const goTrace = `
      --- FAIL: TestProcessManager (0.05s)
          process_test.go:49: expected 200 OK but got 500
    `;
    const goLocs = FailureClassifier.extractStackLocations(goTrace);
    assert.ok(goLocs.length >= 1);
    assert.equal(goLocs[0]?.file, "process_test.go");
    assert.equal(goLocs[0]?.line, 49);

    // Maven test
    const mvnTrace = `
      [ERROR] /src/main/java/App.java:[25,12] cannot find symbol
    `;
    const mvnLocs = FailureClassifier.extractStackLocations(mvnTrace);
    assert.ok(mvnLocs.length >= 1);
    assert.equal(mvnLocs[0]?.line, 25);
  });

  it("T38.2: ClosedLoopTestRemediator passes classified taxonomy into remediation handler", async () => {
    let capturedSnippet = "";
    let capturedTaxonomy = "";

    const mockRunner: any = {
      runTests: async () => ({
        id: "run-1",
        framework: "jest",
        command: "npm test",
        exitCode: 1,
        passed: false,
        durationMs: 50,
        stdout: "",
        stderr: "SyntaxError: Unexpected token '{'",
        parsed: {
          passed: false,
          testsPassed: 0,
          testsFailed: 1,
          failures: [{ testName: "failing test", rawMessage: "SyntaxError: Unexpected token '{'" }],
          rootCauses: ["SyntaxError: Unexpected token '{'"]
        },
        remediationSnippet: "SyntaxError: Unexpected token '{'"
      })
    };

    const remediator = new ClosedLoopTestRemediator(mockRunner, undefined, { maxAttempts: 2, rollbackOnFailure: false });

    await remediator.executeLoop(
      "/tmp",
      async (snippet: string, _attempt: number, classification?: ClassificationResult) => {
        capturedSnippet = snippet;
        capturedTaxonomy = classification?.category || "";
      }
    );

    assert.equal(capturedTaxonomy, "SYNTAX_ERROR");
    assert.ok(capturedSnippet.includes("[FAILURE TAXONOMY]: SYNTAX_ERROR"));
  });
});
