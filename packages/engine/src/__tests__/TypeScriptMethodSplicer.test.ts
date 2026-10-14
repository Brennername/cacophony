import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { TypeScriptMethodSplicer } from "../refactoring/TypeScriptMethodSplicer.js";

describe("T88.5.2: TypeScriptMethodSplicer AST Precondition Validation & Splicing", () => {
  const sampleSource = `
import { Config } from "./config.js";

export class OrderService {
  private readonly config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  public calculateTotal(price: number, quantity: number): number {
    return price * quantity;
  }

  public async processOrder(orderId: string): Promise<boolean> {
    // TODO: implement order processing
    return false;
  }
}
`;

  test("should validate existing class and method in AST", () => {
    const res = TypeScriptMethodSplicer.validateTarget(
      sampleSource,
      "OrderService.ts",
      "OrderService",
      "calculateTotal",
    );

    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.className, "OrderService");
    assert.strictEqual(res.methodName, "calculateTotal");
    assert.ok(res.methodHead?.includes("calculateTotal(price: number, quantity: number): number"));
    assert.ok(res.currentBody?.includes("return price * quantity;"));
  });

  test("should fail validation if class does not exist in AST", () => {
    const res = TypeScriptMethodSplicer.validateTarget(
      sampleSource,
      "OrderService.ts",
      "NonExistentService",
      "calculateTotal",
    );

    assert.strictEqual(res.valid, false);
    assert.ok(res.reason?.includes("Target class 'NonExistentService' not found"));
  });

  test("should fail validation if method does not exist in AST", () => {
    const res = TypeScriptMethodSplicer.validateTarget(
      sampleSource,
      "OrderService.ts",
      "OrderService",
      "nonExistentMethod",
    );

    assert.strictEqual(res.valid, false);
    assert.ok(res.reason?.includes("Target method 'nonExistentMethod' not found"));
  });

  test("should splice replacement method body preserving decorators and other methods", () => {
    const newBody = `
    const subtotal = price * quantity;
    const tax = subtotal * 0.1;
    return subtotal + tax;
    `;

    const result = TypeScriptMethodSplicer.spliceMethod(
      sampleSource,
      "OrderService.ts",
      "OrderService",
      "calculateTotal",
      newBody,
    );

    assert.ok(result.includes("const tax = subtotal * 0.1;"));
    assert.ok(result.includes("processOrder(orderId: string)"), "Preserves other methods in class");
    assert.ok(result.includes("import { Config } from \"./config.js\";"), "Preserves imports");
  });

  test("should reject replacement method body with syntax errors", () => {
    const invalidSyntaxBody = `
    const bad = price * ; // missing operand
    `;

    assert.throws(
      () => {
        TypeScriptMethodSplicer.spliceMethod(
          sampleSource,
          "OrderService.ts",
          "OrderService",
          "calculateTotal",
          invalidSyntaxBody,
        );
      },
      (err: any) => err.message.includes("syntax errors"),
    );
  });
});
