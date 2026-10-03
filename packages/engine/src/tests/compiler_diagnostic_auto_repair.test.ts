import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { CompilerDiagnosticAutoRepair } from "../testing/CompilerDiagnosticAutoRepair.js";

describe("CompilerDiagnosticAutoRepair Test Suite", () => {
  const repairer = new CompilerDiagnosticAutoRepair();

  test("should repair TS6133 by prefixing unused variable with underscore", () => {
    const inputCode = `import * as ts from 'typescript';\n\nexport function check() {\n  const sourceFile = ts.createSourceFile('test.ts', '', ts.ScriptTarget.ES2022);\n  return true;\n}`;
    const diags = [
      {
        filePath: "src/test.ts",
        lineNumber: 4,
        columnNumber: 9,
        severity: "error" as const,
        message: "'sourceFile' is declared but its value is never read.",
        errorCode: "TS6133"
      }
    ];

    const result = repairer.repair(inputCode, diags);
    assert.ok(result.repairedCode.includes("const _sourceFile ="));
    assert.strictEqual(result.repairsApplied.length, 1);
  });

  test("should inject jest test runner compatibility shim on TS2304 Cannot find name 'jest'", () => {
    const inputCode = `import test, { describe } from 'node:test';\n\ndescribe('Suite', () => {\n  test('test', () => {\n    const fn = jest.fn();\n  });\n});`;
    const diags = [
      {
        filePath: "src/test.ts",
        lineNumber: 5,
        columnNumber: 16,
        severity: "error" as const,
        message: "Cannot find name 'jest'.",
        errorCode: "TS2304"
      }
    ];

    const result = repairer.repair(inputCode, diags);
    assert.ok(result.repairedCode.includes("const jest ="));
    assert.ok(result.repairedCode.includes("fn: <T extends"));
    assert.strictEqual(result.repairsApplied.length, 1);
  });

  test("should replace hallucinated vscode import with typescript compiler API", () => {
    const inputCode = `import { Diagnostic, DiagnosticSeverity } from 'vscode';\n\nexport function check() {}`;
    const diags = [
      {
        filePath: "src/test.ts",
        lineNumber: 1,
        columnNumber: 1,
        severity: "error" as const,
        message: "Cannot find module 'vscode' or its corresponding type declarations.",
        errorCode: "TS2307"
      }
    ];

    const result = repairer.repair(inputCode, diags);
    assert.ok(!result.repairedCode.includes("'vscode'"));
    assert.ok(result.repairedCode.includes("import * as ts from 'typescript'"));
  });

  test("should fix relative import missing .js extension on TS2834", () => {
    const inputCode = `import { Foo } from "./Foo";\nexport const f = new Foo();`;
    const diags = [
      {
        filePath: "src/test.ts",
        lineNumber: 1,
        columnNumber: 1,
        severity: "error" as const,
        message: "Relative import paths need explicit file extensions in ECMAScript imports. Did you mean './Foo.js'?",
        errorCode: "TS2834"
      }
    ];

    const result = repairer.repair(inputCode, diags);
    assert.ok(result.repairedCode.includes('from "./Foo.js"'));
  });

  test("should add nullish coalescing for ScriptTarget | undefined", () => {
    const inputCode = `const options = ts.getDefaultCompilerOptions();\nconst sf = ts.createSourceFile('f.ts', code, options.target);`;
    const diags = [
      {
        filePath: "src/test.ts",
        lineNumber: 2,
        columnNumber: 46,
        severity: "error" as const,
        message: "Argument of type 'ScriptTarget | undefined' is not assignable to parameter of type 'ScriptTarget | CreateSourceFileOptions'.",
        errorCode: "TS2345"
      }
    ];

    const result = repairer.repair(inputCode, diags);
    assert.ok(result.repairedCode.includes("options.target ?? ts.ScriptTarget.ES2022"));
  });
});
