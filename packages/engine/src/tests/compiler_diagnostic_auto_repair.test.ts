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

  test("should repair TS2724 by replacing typo member with suggested member", () => {
    const inputCode = `import { BanditPolicy } from '@cacophony/shared-types';\nconst p: BanditPolicy = 'thompson';`;
    const diags = [
      {
        filePath: "src/test.ts",
        lineNumber: 1,
        columnNumber: 10,
        severity: "error" as const,
        message: "'@cacophony/shared-types' has no exported member named 'BanditPolicy'. Did you mean 'BanditPolicyType'?",
        errorCode: "TS2724"
      }
    ];

    const result = repairer.repair(inputCode, diags);
    assert.ok(result.repairedCode.includes("BanditPolicyType"));
    assert.ok(!result.repairedCode.includes("BanditPolicy ="));
  });

  test("should repair TS2305 by removing missing member and declaring local fallback", () => {
    const inputCode = `import { TaskRecord, Action } from '@cacophony/shared-types';\nfunction doAction(a: Action) {}`;
    const diags = [
      {
        filePath: "src/test.ts",
        lineNumber: 1,
        columnNumber: 22,
        severity: "error" as const,
        message: "Module '\"@cacophony/shared-types\"' has no exported member 'Action'.",
        errorCode: "TS2305"
      }
    ];

    const result = repairer.repair(inputCode, diags);
    assert.ok(result.repairedCode.includes("interface Action { [key: string]: any; }"));
    assert.ok(result.repairedCode.includes("import { TaskRecord } from '@cacophony/shared-types';"));
  });

  test("should inject node:test runner functions on TS2304 Cannot find name 'describe'", () => {
    const inputCode = `describe('Suite', () => {\n  it('works', () => {});\n});`;
    const diags = [
      {
        filePath: "src/test.ts",
        lineNumber: 1,
        columnNumber: 1,
        severity: "error" as const,
        message: "Cannot find name 'describe'.",
        errorCode: "TS2304"
      }
    ];

    const result = repairer.repair(inputCode, diags);
    assert.ok(result.repairedCode.includes("import { describe, it, test, beforeEach, afterEach, before, after } from 'node:test';"));
  });

  test("should add missing Angular symbol to @angular/core imports on TS2304", () => {
    const inputCode = `import { Component } from '@angular/core';\n\nexport class Foo {\n  change = new EventEmitter<void>();\n}`;
    const diags = [
      {
        filePath: "src/foo.component.ts",
        lineNumber: 4,
        columnNumber: 16,
        severity: "error" as const,
        message: "Cannot find name 'EventEmitter'.",
        errorCode: "TS2304"
      }
    ];

    const result = repairer.repair(inputCode, diags);
    assert.ok(result.repairedCode.includes("EventEmitter"));
    assert.ok(result.repairedCode.includes("from '@angular/core'"));
  });

  test("should replace missing template file with inline template", () => {
    const inputCode = `@Component({\n  selector: 'app-bar',\n  templateUrl: './bar.component.html'\n})\nexport class BarComponent {}`;
    const diags = [
      {
        filePath: "src/bar.component.ts",
        lineNumber: 3,
        columnNumber: 1,
        severity: "error" as const,
        message: "Could not find template file './bar.component.html'."
      }
    ];

    const result = repairer.repair(inputCode, diags);
    assert.ok(result.repairedCode.includes("template: '<div class=\"component-container\"></div>'"));
    assert.ok(!result.repairedCode.includes("templateUrl"));
  });

  test("should repair TS7006 implicit any parameter", () => {
    const inputCode = `const update = (percentage) => { console.log(percentage); };`;
    const diags = [
      {
        filePath: "src/calc.ts",
        lineNumber: 1,
        columnNumber: 1,
        severity: "error" as const,
        message: "Parameter 'percentage' implicitly has an 'any' type.",
        errorCode: "TS7006"
      }
    ];

    const result = repairer.repair(inputCode, diags);
    assert.ok(result.repairedCode.includes("(percentage: any)"));
  });

  test("should repair TS1002 and TS1005 by stripping truncated trailing line and balancing braces", () => {
    const inputCode = `describe('Suite', () => {\n  it('test', () => {\n    assert.ok(result.includes("`;
    const diags = [
      {
        filePath: "src/suite.test.ts",
        lineNumber: 3,
        columnNumber: 1,
        severity: "error" as const,
        message: "Unterminated string literal.",
        errorCode: "TS1002"
      },
      {
        filePath: "src/suite.test.ts",
        lineNumber: 3,
        columnNumber: 1,
        severity: "error" as const,
        message: "')' expected.",
        errorCode: "TS1005"
      }
    ];

    const result = repairer.repair(inputCode, diags);
    assert.ok(!result.repairedCode.includes("assert.ok(result.includes(\""));
    assert.ok(result.repairedCode.includes("});"));
  });
});
