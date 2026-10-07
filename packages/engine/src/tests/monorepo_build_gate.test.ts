import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { MonorepoBuildGate } from "../gitea/MonorepoBuildGate.js";
import { SandboxedProcessRunner, type SandboxedProcessOptions, type SandboxedProcessResult } from "../testing/SandboxedProcessRunner.js";

class StubProcessRunner extends SandboxedProcessRunner {
  public mockResult: SandboxedProcessResult = {
    exitCode: 0,
    signal: null,
    durationMs: 150,
    stdout: "Build succeeded",
    stderr: "",
    timedOut: false,
    truncated: false
  };

  public lastCommand: string | null = null;
  public lastCwd: string | null = null;

  public override async run(command: string, options: SandboxedProcessOptions): Promise<SandboxedProcessResult> {
    this.lastCommand = command;
    this.lastCwd = options.cwd;
    return this.mockResult;
  }
}

describe("MonorepoBuildGate Suite (T80.1)", () => {
  test("extractDiagnostics accurately parses TypeScript and Angular diagnostic codes with file and line", () => {
    const gate = new MonorepoBuildGate();

    const output = `
> @cacophony/engine@1.0.0 build
> tsc -b

packages/engine/src/foo.ts(42,10): error TS2304: Cannot find name 'UndefinedSymbol'.
packages/engine/src/bar.ts:15:3 - error TS2305: Module '"./types"' has no exported member 'MissingType'.
packages/engine/src/baz.ts:88:1 - error TS2322: Type 'string' is not assignable to type 'number'.
Error: NG2008: Component ModelsViewComponent is missing templateUrl
packages/frontend/src/app/view.ts(104,7): error NG8001: 'custom-card' is not a known element.
`;

    const diagnostics = gate.extractDiagnostics(output);

    assert.equal(diagnostics.length, 5);

    const d0 = diagnostics[0]!;
    assert.equal(d0.code, "TS2304");
    assert.equal(d0.file, "packages/engine/src/foo.ts");
    assert.equal(d0.line, 42);
    assert.equal(d0.column, 10);
    assert.equal(d0.message, "Cannot find name 'UndefinedSymbol'.");

    const d1 = diagnostics[1]!;
    assert.equal(d1.code, "TS2305");
    assert.equal(d1.file, "packages/engine/src/bar.ts");
    assert.equal(d1.line, 15);
    assert.equal(d1.column, 3);
    assert.equal(d1.message, "Module '\"./types\"' has no exported member 'MissingType'.");

    const d2 = diagnostics[2]!;
    assert.equal(d2.code, "TS2322");
    assert.equal(d2.file, "packages/engine/src/baz.ts");
    assert.equal(d2.line, 88);

    const d3 = diagnostics[3]!;
    assert.equal(d3.code, "NG2008");
    assert.equal(d3.message, "Component ModelsViewComponent is missing templateUrl");

    const d4 = diagnostics[4]!;
    assert.equal(d4.code, "NG8001");
    assert.equal(d4.file, "packages/frontend/src/app/view.ts");
    assert.equal(d4.line, 104);
  });

  test("verifyBuild returns passed: true when process exits with code 0", async () => {
    const stubRunner = new StubProcessRunner();
    stubRunner.mockResult = {
      exitCode: 0,
      signal: null,
      durationMs: 4200,
      stdout: "Building packages... Done.",
      stderr: "",
      timedOut: false,
      truncated: false
    };

    const gate = new MonorepoBuildGate({ sandboxedRunner: stubRunner });
    const result = await gate.verifyBuild("/workspace/worktrees/task-1");

    assert.equal(stubRunner.lastCommand, "npm run build");
    assert.equal(stubRunner.lastCwd, "/workspace/worktrees/task-1");
    assert.equal(result.passed, true);
    assert.equal(result.exitCode, 0);
    assert.equal(result.diagnostics.length, 0);
    assert.equal(result.failureSummary, undefined);
  });

  test("verifyBuild returns passed: false and summarizes diagnostic errors on failure", async () => {
    const stubRunner = new StubProcessRunner();
    stubRunner.mockResult = {
      exitCode: 2,
      signal: null,
      durationMs: 3100,
      stdout: "packages/engine/src/broken.ts(10,5): error TS2304: Cannot find name 'unresolved'.",
      stderr: "npm ERR! Lifecycle script failed.",
      timedOut: false,
      truncated: false
    };

    const gate = new MonorepoBuildGate({ sandboxedRunner: stubRunner });
    const result = await gate.verifyBuild("/workspace/worktrees/task-2");

    assert.equal(result.passed, false);
    assert.equal(result.exitCode, 2);
    assert.equal(result.diagnostics.length, 1);
    assert.equal(result.diagnostics[0]!.code, "TS2304");
    assert.match(result.failureSummary!, /TS2304 in packages\/engine\/src\/broken.ts/);
  });
});
