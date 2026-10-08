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

  it("repairs explicit ESM .js extensions on relative imports", () => {
    const source = `import { Foo } from "./Foo";\nexport const value = new Foo();`;
    const result = repairer.repair(source, [diagnostic(
      "TS2834",
      "Relative import paths need explicit file extensions in ECMAScript imports. Did you mean './Foo.js'?"
    )]);

    assert.equal(result.repairedCode, `import { Foo } from "./Foo.js";\nexport const value = new Foo();`);
    assert.equal(result.repairsApplied.length, 1);
  });

  it("repairs TS6133 by prefixing unused variable with underscore", () => {
    const source = `const unusedVar = 42;\nexport const active = 100;`;
    const result = repairer.repair(source, [diagnostic(
      "TS6133",
      "'unusedVar' is declared but its value is never read.",
      1
    )]);

    assert.ok(result.repairedCode.includes("const _unusedVar ="));
    assert.equal(result.repairsApplied.length, 1);
  });

  it("repairs TS7006 by adding ': any' type annotation to implicit parameter", () => {
    const source = `const handler = (payload) => console.log(payload);`;
    const result = repairer.repair(source, [diagnostic(
      "TS7006",
      "Parameter 'payload' implicitly has an 'any' type.",
      1
    )]);

    assert.ok(result.repairedCode.includes("(payload: any)"));
    assert.equal(result.repairsApplied.length, 1);
  });

  it("repairs TS2304 Jest runner missing by injecting compatibility shim", () => {
    const source = `describe('Suite', () => { it('test', () => { const mock = jest.fn(); }); });`;
    const result = repairer.repair(source, [diagnostic(
      "TS2304",
      "Cannot find name 'jest'."
    )]);

    assert.ok(result.repairedCode.includes("const jest ="));
    assert.ok(result.repairedCode.includes("fn: <T extends"));
    assert.equal(result.repairsApplied.length, 1);
  });

  it("repairs TS2304 missing node:test lifecycle functions", () => {
    const source = `describe('Suite', () => { it('works', () => {}); });`;
    const result = repairer.repair(source, [diagnostic(
      "TS2304",
      "Cannot find name 'describe'."
    )]);

    assert.ok(result.repairedCode.includes("import { describe, it, test, beforeEach, afterEach, before, after } from 'node:test';"));
  });

  it("repairs TS2304 missing Angular core symbols", () => {
    const source = `import { Component } from '@angular/core';\nexport class MyComp { count = signal(0); }`;
    const result = repairer.repair(source, [diagnostic(
      "TS2304",
      "Cannot find name 'signal'."
    )]);

    assert.ok(result.repairedCode.includes("Component, signal"));
  });

  it("repairs missing Angular template files with inline placeholder", () => {
    const source = `@Component({\n  selector: 'app-bar',\n  templateUrl: './bar.component.html'\n})\nexport class BarComponent {}`;
    const result = repairer.repair(source, [diagnostic(
      "TS2304",
      "Could not find template file './bar.component.html'."
    )]);

    assert.ok(result.repairedCode.includes("template: '<div class=\"component-container\"></div>'"));
    assert.ok(!result.repairedCode.includes("templateUrl"));
  });

  it("repairs TS1002/TS1005 unterminated string literals and balances unclosed braces at EOF", () => {
    const source = `describe('Suite', () => {\n  it('test', () => {\n    assert.ok("truncated`;
    const result = repairer.repair(source, [
      diagnostic("TS1002", "Unterminated string literal.", 3),
      diagnostic("TS1005", "')' expected.", 3)
    ]);

    assert.ok(!result.repairedCode.includes('assert.ok("truncated'));
    assert.ok(result.repairedCode.includes("});"));
  });

  it("repairs TS2345 ScriptTarget undefined with nullish coalescing", () => {
    const source = `const sf = ts.createSourceFile('f.ts', code, options.target);`;
    const result = repairer.repair(source, [diagnostic(
      "TS2345",
      "Argument of type 'ScriptTarget | undefined' is not assignable to parameter of type 'ScriptTarget | CreateSourceFileOptions'.",
      1
    )]);

    assert.ok(result.repairedCode.includes("options.target ?? ts.ScriptTarget.ES2022"));
  });

  it("replaces hallucinated vscode module import with typescript compiler API", () => {
    const source = `import { Diagnostic } from 'vscode';\nexport function check() {}`;
    const result = repairer.repair(source, [diagnostic(
      "TS2307",
      "Cannot find module 'vscode' or its corresponding type declarations."
    )]);

    assert.ok(!result.repairedCode.includes("'vscode'"));
    assert.ok(result.repairedCode.includes("import * as ts from 'typescript'"));
  });

  it("T91.3.2: auto-generates AST repair template and applies dynamically registered repairs", () => {
    const orig = `const val: number = 'test';`;
    const rep = `const val: string = 'test';`;
    const diag = diagnostic("TS2322", "Type 'string' is not assignable to type 'number'.", 1);

    const template = CompilerDiagnosticAutoRepair.generateRepairTemplate(diag, orig, rep);
    assert.ok(template.includes("repairTS2322"));
    assert.ok(template.includes("Type 'string' is not assignable to type 'number'."));

    // Test dynamic repair registration
    repairer.registerDynamicRepair("TS2322", (code, d) => {
      if (d.errorCode === "TS2322" && code.includes("const val: number = 'test';")) {
        return {
          repairedCode: code.replace("const val: number", "const val: string"),
          description: "Dynamically repaired type mismatch"
        };
      }
      return null;
    });

    const dynamicResult = repairer.repair(orig, [diag]);
    assert.strictEqual(dynamicResult.repairedCode, "const val: string = 'test';");
    assert.ok(dynamicResult.repairsApplied.includes("Dynamically repaired type mismatch"));
  });

  it("repairs TS6133 on import statements by removing the unused import instead of prefixing", () => {
    const source = `import test, { describe, it } from 'node:test';\ndescribe('Suite', () => { it('ok', () => {}); });`;
    const result = repairer.repair(source, [diagnostic(
      "TS6133",
      "'test' is declared but its value is never read.",
      1
    )]);

    assert.ok(!result.repairedCode.includes("_test"));
    assert.ok(result.repairedCode.includes("import { describe, it } from 'node:test';"));
  });

  it("repairs TS6133 on previously underscore-prefixed local variables by adding @ts-ignore", () => {
    const source = `const _afterEach = () => {};\nexport const active = true;`;
    const result = repairer.repair(source, [diagnostic(
      "TS6133",
      "'_afterEach' is declared but its value is never read.",
      1
    )]);

    assert.ok(result.repairedCode.includes("// @ts-ignore\nconst _afterEach ="));
  });

  it("repairs TS2307 by resolving relative module path in workspace", () => {
    const source = `import { TokenEstimator } from '../../src/token_estimator/TokenEstimator.js';`;
    const result = repairer.repair(
      source,
      [diagnostic(
        "TS2307",
        "Cannot find module '../../src/token_estimator/TokenEstimator.js' or its corresponding type declarations."
      )],
      "packages/engine/src/tests/token_estimator.test.ts"
    );

    assert.ok(result.repairedCode.includes("../inference/TokenEstimator.js"));
  });

  it("repairs TS2307 by stubbing unresolvable module class exports", () => {
    const source = `import { StandardTokenizer } from '../../src/tokenizer/StandardTokenizer.js';`;
    const result = repairer.repair(
      source,
      [diagnostic(
        "TS2307",
        "Cannot find module '../../src/tokenizer/StandardTokenizer.js' or its corresponding type declarations."
      )],
      "packages/engine/src/tests/token_estimator.test.ts"
    );

    assert.ok(result.repairedCode.includes("class StandardTokenizer"));
  });

  it("repairs TS2304 missing beforeEach without declaring unused local constants", () => {
    const source = `describe('Suite', () => { beforeEach(() => {}); it('ok', () => {}); });`;
    const result = repairer.repair(source, [diagnostic(
      "TS2304",
      "Cannot find name 'beforeEach'."
    )]);

    assert.ok(!result.repairedCode.includes("const afterEach ="));
    assert.ok(!result.repairedCode.includes("const beforeAll ="));
    assert.ok(result.repairedCode.includes("beforeEach"));
  });

  it("repairs TS2304 Jest runner missing by injecting compatibility shim with .mock property", () => {
    const source = `describe('Suite', () => { it('test', () => { const mock = jest.fn(); expect(mock.mock.calls.length).toBe(0); }); });`;
    const result = repairer.repair(source, [diagnostic(
      "TS2304",
      "Cannot find name 'jest'."
    )]);

    assert.ok(result.repairedCode.includes("const jest ="));
    assert.ok(result.repairedCode.includes("calls: [] as any[][]"));
    assert.ok(result.repairedCode.includes("mockFn.mock ="));
  });

  it("repairs TS2305 with nested quotes and provides callable fallback stub", () => {
    const source = `import { runTui, otherUtil } from '../cli/runTui.js';\nexport function execute() { return runTui(); }`;
    const result = repairer.repair(source, [diagnostic(
      "TS2305",
      "Module '\"../cli/runTui.js\"' has no exported member 'runTui'."
    )]);

    assert.ok(result.repairedCode.includes("import { otherUtil } from '../cli/runTui.js';"));
    assert.ok(result.repairedCode.includes("interface runTui"));
    assert.ok(result.repairedCode.includes("const runTui: any ="));
    assert.ok(!result.repairedCode.includes("import { runTui, otherUtil }"));
  });

  it("repairs TS2339 property not found by casting target to any", () => {
    const source = `function check(myMock: Function) {\n  const count = myMock.mock.calls.length;\n  return count;\n}`;
    const result = repairer.repair(source, [diagnostic(
      "TS2339",
      "Property 'mock' does not exist on type 'Function'.",
      2
    )]);

    assert.ok(result.repairedCode.includes("(myMock as any).mock.calls.length"));
    assert.ok(result.repairsApplied.some((r) => r.includes("Cast target of '.mock' to 'any'")));
  });
});

