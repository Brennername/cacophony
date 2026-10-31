import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MethodEditAdapter } from "../refactoring/MethodEditAdapter.js";

describe("MethodEditAdapter", () => {
  const sampleSource = `
export class OrderService {
  private taxRate = 0.08;

  public calculateTotal(subtotal: number): number {
    return subtotal;
  }

  public getTaxRate(): number {
    return this.taxRate;
  }
}
`;

  it("should splice method body with raw implementation statements", () => {
    const result = MethodEditAdapter.applyMethodEdit({
      source: sampleSource,
      fileName: "OrderService.ts",
      className: "OrderService",
      methodName: "calculateTotal",
      newBodyOrCompletion: "return subtotal * (1 + this.taxRate);",
    });

    assert.equal(result.success, true);
    assert.ok(result.splicedSource.includes("return subtotal * (1 + this.taxRate);"));
    assert.ok(!result.splicedSource.includes("return subtotal;\n"));
    assert.ok(result.bytesReplaced > 0);
  });

  it("should strip markdown fences from completion", () => {
    const result = MethodEditAdapter.applyMethodEdit({
      source: sampleSource,
      fileName: "OrderService.ts",
      className: "OrderService",
      methodName: "calculateTotal",
      newBodyOrCompletion: "```typescript\nconst tax = subtotal * this.taxRate;\nreturn subtotal + tax;\n```",
    });

    assert.equal(result.success, true);
    assert.ok(result.splicedSource.includes("const tax = subtotal * this.taxRate;"));
    assert.ok(!result.splicedSource.includes("```"));
  });

  it("should unwrap accidental method signature wrapper from model output", () => {
    const completionWithMethodSig = `
      public calculateTotal(subtotal: number): number {
        const discount = subtotal > 100 ? 10 : 0;
        return (subtotal - discount) * (1 + this.taxRate);
      }
    `;

    const result = MethodEditAdapter.applyMethodEdit({
      source: sampleSource,
      fileName: "OrderService.ts",
      className: "OrderService",
      methodName: "calculateTotal",
      newBodyOrCompletion: completionWithMethodSig,
    });

    assert.equal(result.success, true);
    assert.ok(result.splicedSource.includes("const discount = subtotal > 100 ? 10 : 0;"));
    assert.ok(!result.splicedSource.includes("calculateTotal(subtotal: number): number {\n        const discount"));
  });

  it("should unwrap accidental outer class declaration from model output", () => {
    const completionWithClass = `
      class OrderService {
        public calculateTotal(subtotal: number): number {
          return subtotal * 1.05;
        }
      }
    `;

    const result = MethodEditAdapter.applyMethodEdit({
      source: sampleSource,
      fileName: "OrderService.ts",
      className: "OrderService",
      methodName: "calculateTotal",
      newBodyOrCompletion: completionWithClass,
    });

    assert.equal(result.success, true);
    assert.ok(result.splicedSource.includes("return subtotal * 1.05;"));
  });

  it("should fail gracefully when target class does not exist", () => {
    const result = MethodEditAdapter.applyMethodEdit({
      source: sampleSource,
      fileName: "OrderService.ts",
      className: "MissingService",
      methodName: "calculateTotal",
      newBodyOrCompletion: "return 0;",
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.includes("MissingService"));
    assert.equal(result.splicedSource, sampleSource);
  });

  it("should fail gracefully when target method does not exist in class", () => {
    const result = MethodEditAdapter.applyMethodEdit({
      source: sampleSource,
      fileName: "OrderService.ts",
      className: "OrderService",
      methodName: "nonExistentMethod",
      newBodyOrCompletion: "return 0;",
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.includes("nonExistentMethod"));
  });

  it("should reject completion that causes syntax errors", () => {
    const result = MethodEditAdapter.applyMethodEdit({
      source: sampleSource,
      fileName: "OrderService.ts",
      className: "OrderService",
      methodName: "calculateTotal",
      newBodyOrCompletion: "return ; ; ; ; def invalid syntax ((((",
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.includes("syntax"));
  });
});
