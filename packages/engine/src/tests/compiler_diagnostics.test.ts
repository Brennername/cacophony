import { describe, it } from "node:test";
import assert from "node:assert";
import {
  CompilerDiagnosticParser,
  CompilerDiagnostic
} from "../testing/CompilerDiagnosticParser.js";

describe("CompilerDiagnosticParser Test Suite", () => {
  it("should parse standard colon-separated TypeScript compiler error line", () => {
    const line = "src/scheduler/AutonomousWorkerPipeline.ts:42:15 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.";
    const diag = CompilerDiagnosticParser.parseLine(line);

    assert.ok(diag, "Diagnostic should be extracted");
    assert.strictEqual(diag.filePath, "src/scheduler/AutonomousWorkerPipeline.ts");
    assert.strictEqual(diag.lineNumber, 42);
    assert.strictEqual(diag.columnNumber, 15);
    assert.strictEqual(diag.severity, "error");
    assert.strictEqual(diag.errorCode, "TS2345");
    assert.strictEqual(
      diag.message,
      "Argument of type 'string' is not assignable to parameter of type 'number'."
    );
  });

  it("should parse paren-separated TypeScript compiler error line", () => {
    const line = "packages/engine/src/index.ts(15,20): error TS2304: Cannot find name 'UndefinedSymbol'.";
    const diag = CompilerDiagnosticParser.parseLine(line);

    assert.ok(diag, "Diagnostic should be extracted");
    assert.strictEqual(diag.filePath, "packages/engine/src/index.ts");
    assert.strictEqual(diag.lineNumber, 15);
    assert.strictEqual(diag.columnNumber, 20);
    assert.strictEqual(diag.severity, "error");
    assert.strictEqual(diag.errorCode, "TS2304");
    assert.strictEqual(diag.message, "Cannot find name 'UndefinedSymbol'.");
  });

  it("should parse warning diagnostic lines cleanly", () => {
    const line = "src/utils.ts:8:1 - warning TS6133: 'unusedVar' is declared but its value is never read.";
    const diag = CompilerDiagnosticParser.parseLine(line);

    assert.ok(diag, "Warning diagnostic should be extracted");
    assert.strictEqual(diag.severity, "warning");
    assert.strictEqual(diag.errorCode, "TS6133");
    assert.strictEqual(diag.lineNumber, 8);
  });

  it("should parse multi-line Angular esbuild compiler outputs", () => {
    const lines = [
      "[ERROR] TS2307: Cannot find module '../../services/test-history.service' or its corresponding type declarations. [plugin angular-compiler]",
      "",
      "    packages/frontend/src/app/components/views/testing-view.component.ts:4:35:",
      "      4 | import { TestHistoryService } from '../../services/test-history.service';",
      "        ^                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
    ];

    const diags = CompilerDiagnosticParser.parseLines(lines);
    assert.strictEqual(diags.length, 1);
    const diag = diags[0]!;
    assert.strictEqual(
      diag.filePath,
      "packages/frontend/src/app/components/views/testing-view.component.ts"
    );
    assert.strictEqual(diag.lineNumber, 4);
    assert.strictEqual(diag.columnNumber, 35);
    assert.strictEqual(diag.severity, "error");
    assert.strictEqual(diag.errorCode, "TS2307");
    assert.ok(diag.message.includes("Cannot find module"));
  });

  it("should filter and prioritize top 3 root-cause syntax and type diagnostics", () => {
    const rawDiagnostics: CompilerDiagnostic[] = [
      {
        filePath: "src/a.ts",
        lineNumber: 10,
        columnNumber: 5,
        severity: "warning",
        message: "Unused variable",
        errorCode: "TS6133"
      },
      {
        filePath: "src/b.ts",
        lineNumber: 20,
        columnNumber: 3,
        severity: "error",
        message: "Type mismatch",
        errorCode: "TS2322"
      },
      {
        filePath: "src/c.ts",
        lineNumber: 5,
        columnNumber: 1,
        severity: "error",
        message: "Cannot find module 'unknown-mod'",
        errorCode: "TS2307"
      },
      {
        filePath: "src/d.ts",
        lineNumber: 1,
        columnNumber: 1,
        severity: "error",
        message: "Unexpected token ';'",
        errorCode: "TS1005"
      },
      {
        filePath: "src/e.ts",
        lineNumber: 50,
        columnNumber: 8,
        severity: "error",
        message: "Cannot find name 'missingVar'",
        errorCode: "TS2304"
      }
    ];

    const prioritized = CompilerDiagnosticParser.prioritizeDiagnostics(rawDiagnostics, 3);
    assert.strictEqual(prioritized.length, 3, "Should limit to exactly 3 diagnostics");

    const codes = prioritized.map((d) => d.errorCode);
    assert.ok(codes.includes("TS2307"), "Should prioritize missing module");
    assert.ok(codes.includes("TS2304"), "Should prioritize missing name");
    assert.ok(codes.includes("TS1005"), "Should prioritize syntax error");
  });
});
