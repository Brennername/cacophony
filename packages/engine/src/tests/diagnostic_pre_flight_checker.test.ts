import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DiagnosticPreFlightChecker } from "../testing/DiagnosticPreFlightChecker.js";

describe("DiagnosticPreFlightChecker Input Robustness Tests (T-S4.4)", () => {
  const checker = new DiagnosticPreFlightChecker();

  it("should handle valid single-line code inputs cleanly", () => {
    const singleLine = "export const meaningOfLife: number = 42;";
    const result = checker.checkSyntax(singleLine);

    assert.equal(result.isValid, true);
    assert.equal(result.diagnostics.length, 0);
  });

  it("should strip ANSI color escape sequences without crashing", () => {
    const ansiCode = "\x1b[32mexport const status: string = 'ok';\x1b[0m";
    const result = checker.checkSyntax(ansiCode);

    assert.equal(result.isValid, true);
  });

  it("should strip markdown fences around valid code blocks", () => {
    const markdownFenced = "```typescript\nexport const greet = (name: string): string => `Hello ${name}`;\n```";
    const result = checker.checkSyntax(markdownFenced);

    assert.equal(result.isValid, true);
  });

  it("should return structured error for non-string or malformed inputs without throwing", () => {
    const nullInput = (null as unknown) as string;
    const result = checker.checkSyntax(nullInput);

    assert.equal(result.isValid, false);
    assert.equal(result.diagnostics.length, 1);
    assert.equal(result.diagnostics[0]?.message, "Source code is empty.");
  });

  it("should catch syntax errors in malformed expressions and format summary", () => {
    const broken = "export const val: number = ;";
    const result = checker.checkSyntax(broken);

    assert.equal(result.isValid, false);
    assert.ok(result.rawErrorSummary?.includes("TS"));
  });
});
