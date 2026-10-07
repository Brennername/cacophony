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
});
