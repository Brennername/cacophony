import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DiagnosticPreFlightChecker } from "../testing/DiagnosticPreFlightChecker.js";

describe("DiagnosticPreFlightChecker Test Suite (T63.6)", () => {
  const checker = new DiagnosticPreFlightChecker();

  it("should validate syntactically correct TypeScript code as valid", () => {
    const validCode = `
      export interface UserProfile {
        readonly id: string;
        readonly name: string;
        readonly score: number;
      }

      export class UserService {
        private users: Map<string, UserProfile> = new Map();

        public addUser(user: UserProfile): void {
          this.users.set(user.id, user);
        }

        public getUser(id: string): UserProfile | undefined {
          return this.users.get(id);
        }
      }
    `;

    const result = checker.checkSyntax(validCode);
    assert.equal(result.isValid, true);
    assert.equal(result.diagnostics.length, 0);
    assert.equal(result.rawErrorSummary, undefined);
  });

  it("should catch syntax errors with unclosed braces and malformed expressions", () => {
    const brokenCode = `
      export class BrokenService {
        public calculateTotal(a: number, b: number): number {
          return a + (b * ;
        }
      }
    `;

    const result = checker.checkSyntax(brokenCode);
    assert.equal(result.isValid, false);
    assert.ok(result.diagnostics.length > 0);
    assert.ok(result.rawErrorSummary?.includes("TS"));
    const errorDiag = result.diagnostics.find((d) => d.category === "error");
    assert.ok(errorDiag, "Should find at least one error diagnostic");
    assert.ok(errorDiag.line > 0);
  });

  it("should reject empty or whitespace-only code strings", () => {
    const emptyResult = checker.checkSyntax("");
    assert.equal(emptyResult.isValid, false);
    assert.equal(emptyResult.diagnostics[0]?.message, "Source code is empty.");

    const whitespaceResult = checker.checkSyntax("    \n\t  ");
    assert.equal(whitespaceResult.isValid, false);
    assert.equal(
      whitespaceResult.diagnostics[0]?.message,
      "Source code is empty.",
    );
  });

  it("should catch unexpected tokens and illegal declarations fast in memory", () => {
    const malformedCode = `
      const x = 10;
      function () { return 42; } // missing function name
      const y = ;
    `;

    const result = checker.checkSyntax(malformedCode);
    assert.equal(result.isValid, false);
    assert.ok(result.diagnostics.length >= 1);
  });
});
