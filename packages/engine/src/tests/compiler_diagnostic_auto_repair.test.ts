import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CompilerDiagnosticAutoRepair } from "../testing/CompilerDiagnosticAutoRepair.js";
import type { CompilerDiagnostic } from "../testing/CompilerDiagnosticParser.js";

const diagnostic = (errorCode: string, message: string, lineNumber = 1): CompilerDiagnostic => ({
  filePath: "src/example.ts",
  lineNumber,
  columnNumber: 1,
  severity: "error",
  message,
  errorCode
});

describe("CompilerDiagnosticAutoRepair", () => {
  const repairer = new CompilerDiagnosticAutoRepair();

  it("repairs only a compiler-suggested ESM .js extension", () => {
    const source = `import { Foo } from "./Foo";\nexport const value = new Foo();`;
    const result = repairer.repair(source, [diagnostic(
      "TS2834",
      "Relative import paths need explicit file extensions. Did you mean './Foo.js'?"
    )]);

    assert.equal(result.repairedCode, `import { Foo } from "./Foo.js";\nexport const value = new Foo();`);
    assert.equal(result.repairsApplied.length, 1);
  });

  it("preserves source unchanged for diagnostics requiring semantic or type decisions", () => {
    const cases: Array<[string, string]> = [
      ["TS6133", "'unusedImport' is declared but its value is never read."],
      ["TS2304", "Cannot find name 'beforeEach'."],
      ["TS2304", "Cannot find name 'jest'."],
      ["TS2304", "Cannot find name 'expect'."],
      ["TS2307", "Cannot find module 'vscode'."],
      ["TS2305", "Module '@cacophony/shared-types' has no exported member 'Action'."],
      ["TS2724", "Module has no exported member named 'BanditPolicy'. Did you mean 'BanditPolicyType'?"],
      ["TS7006", "Parameter 'percentage' implicitly has an 'any' type."],
      ["TS1002", "Unterminated string literal."]
    ];

    for (const [code, message] of cases) {
      const source = `import { Action } from '@cacophony/shared-types';\n${message}`;
      const result = repairer.repair(source, [diagnostic(code, message)]);
      assert.equal(result.repairedCode, source, `${code} should be handled by semantic remediation`);
      assert.deepEqual(result.repairsApplied, []);
    }
  });

  it("does not apply a safe repair when the same build has any unresolved semantic error", () => {
    const source = `import { Foo } from "./Foo";`;
    const result = repairer.repair(source, [
      diagnostic("TS2834", "Did you mean './Foo.js'?"),
      diagnostic("TS2304", "Cannot find name 'TaskBranchOptions'.")
    ]);

    assert.equal(result.repairedCode, source);
    assert.deepEqual(result.repairsApplied, []);
  });
});
