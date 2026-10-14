import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { MethodEditAdapter } from "../refactoring/MethodEditAdapter.js";

describe("T88.5.1: MethodEditAdapter AST-Validated Method Replacement", () => {
  const sampleFile = `
import { Logger } from "./logger.js";

export class TokenValidator {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public validateToken(token: string): boolean {
    return token.length > 0;
  }

  public refreshToken(token: string): string {
    return token;
  }
}
`;

  test("should replace method body directly without regenerating whole file", () => {
    const newBody = `
    if (!token || token.length < 10) {
      this.logger.warn("Token rejected due to insufficient length");
      return false;
    }
    return true;
    `;

    const res = MethodEditAdapter.applyMethodEdit({
      source: sampleFile,
      fileName: "TokenValidator.ts",
      className: "TokenValidator",
      methodName: "validateToken",
      newBodyOrCompletion: newBody,
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.splicedSource.includes("this.logger.warn(\"Token rejected"));
    assert.ok(res.splicedSource.includes("refreshToken(token: string)"), "Preserves other methods in file");
    assert.ok(res.splicedSource.includes("import { Logger } from \"./logger.js\";"), "Preserves imports");
  });

  test("should automatically extract method body when model wraps in method signature", () => {
    const wrappedCompletion = `\`\`\`typescript
public validateToken(token: string): boolean {
  return token.startsWith("ey");
}
\`\`\``;

    const res = MethodEditAdapter.applyMethodEdit({
      source: sampleFile,
      fileName: "TokenValidator.ts",
      className: "TokenValidator",
      methodName: "validateToken",
      newBodyOrCompletion: wrappedCompletion,
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.splicedSource.includes("return token.startsWith(\"ey\");"));
    assert.ok(!res.splicedSource.includes("public validateToken(token: string): boolean {\n  public validateToken"), "No double signature nesting");
  });

  test("should reject edits targeting non-existent methods", () => {
    const res = MethodEditAdapter.applyMethodEdit({
      source: sampleFile,
      fileName: "TokenValidator.ts",
      className: "TokenValidator",
      methodName: "revokeToken",
      newBodyOrCompletion: "return true;",
    });

    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes("Target method 'revokeToken' not found"));
  });
});
