import test from "node:test";
import assert from "node:assert/strict";
import { MonorepoBuildGate } from "../gitea/MonorepoBuildGate.js";
import { SandboxedProcessRunner, type SandboxedProcessResult } from "../testing/SandboxedProcessRunner.js";

test("Worktree Pre-Commit Monorepo Build Gate Suite (T84.2)", async (t) => {
  await t.test("should verify clean build passes when npm run build succeeds", async () => {
    const stubRunner = new SandboxedProcessRunner();
    stubRunner.run = async (): Promise<SandboxedProcessResult> => ({
      exitCode: 0,
      signal: null,
      stdout: "> @cacophony/engine@1.0.0 build\n> tsc -b\nCompilation successful",
      stderr: "",
      durationMs: 400,
      timedOut: false,
      truncated: false
    });

    const gate = new MonorepoBuildGate({ sandboxedRunner: stubRunner });
    const result = await gate.verifyCleanBuild("/tmp/mock-worktree");

    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.diagnostics.length, 0);
  });

  await t.test("should reject non-compiling worktree changes and extract compiler diagnostics", async () => {
    const stubRunner = new SandboxedProcessRunner();
    stubRunner.run = async (): Promise<SandboxedProcessResult> => ({
      exitCode: 1,
      signal: null,
      stdout: "src/service.ts:15:3 - error TS2304: Cannot find name 'UnresolvedType'.\nsrc/model.ts(20,5): error TS2322: Type 'number' is not assignable to type 'string'.",
      stderr: "",
      durationMs: 350,
      timedOut: false,
      truncated: false
    });

    const gate = new MonorepoBuildGate({ sandboxedRunner: stubRunner });
    const result = await gate.verifyCleanBuild("/tmp/mock-failing-worktree");

    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.exitCode, 1);
    assert.strictEqual(result.diagnostics.length, 2);
    assert.strictEqual(result.diagnostics[0]?.code, "TS2304");
    assert.strictEqual(result.diagnostics[1]?.code, "TS2322");
    assert.ok(result.failureSummary?.includes("TS2304"));
  });
});
