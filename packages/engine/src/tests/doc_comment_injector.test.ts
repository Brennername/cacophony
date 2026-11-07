import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FunctionAstLocator } from "../ast/FunctionAstLocator.js";
import { DocCommentInjector } from "../ast/DocCommentInjector.js";

describe("FunctionAstLocator & DocCommentInjector", () => {
  const locator = new FunctionAstLocator();
  const injector = new DocCommentInjector(locator);

  const sampleSource = `
export class OrderProcessor {
  private taxRate = 0.08;

  public async calculateTotal(subtotal: number, discount = 0): Promise<number> {
    const discounted = subtotal - discount;
    return discounted + discounted * this.taxRate;
  }
}

export function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2);
}

const computeHash = (data: string): string => {
  return Buffer.from(data).toString('base64');
};
`.trim();

  it("should extract function, method, and arrow function AST boundaries", () => {
    const functions = locator.locateFunctions(sampleSource, "order.ts");
    assert.strictEqual(functions.length, 3);

    const method = functions.find((f) => f.name === "calculateTotal");
    assert.ok(method);
    assert.strictEqual(method.isAsync, true);
    assert.strictEqual(method.parameters.length, 2);
    assert.strictEqual(method.parameters[0]!.name, "subtotal");
    assert.strictEqual(method.parameters[0]!.type, "number");
    assert.strictEqual(method.parameters[1]!.name, "discount");
    assert.strictEqual(method.parameters[1]!.defaultValue, "0");
    assert.strictEqual(method.returnType, "Promise<number>");

    const fn = functions.find((f) => f.name === "formatCurrency");
    assert.ok(fn);
    assert.strictEqual(fn.isExported, true);
    assert.strictEqual(fn.parameters.length, 1);

    const arrow = functions.find((f) => f.name === "computeHash");
    assert.ok(arrow);
    assert.strictEqual(arrow.scopeKind, "arrow");
  });

  it("should non-destructively inject JSDoc comment above a class method with proper indentation", () => {
    const comment = `
/**
 * Calculates the final total order price including dynamic tax and discounts.
 * @param subtotal Raw subtotal amount
 * @param discount Optional discount to deduct
 * @returns Final calculated amount with tax applied
 */
`.trim();

    const result = injector.injectDocComment(sampleSource, "calculateTotal", comment, "order.ts");
    assert.strictEqual(result.success, true);
    assert.ok(result.modifiedContent.includes("Calculates the final total order price"));

    // Verify indentation aligned with method (2 spaces)
    assert.ok(result.modifiedContent.includes("  /**\n   * Calculates the final total"));

    // Verify original method body remains unchanged
    assert.ok(result.modifiedContent.includes("const discounted = subtotal - discount;"));
    assert.ok(result.modifiedContent.includes("return discounted + discounted * this.taxRate;"));
  });

  it("should replace existing JSDoc comment when re-injecting a rerolled comment", () => {
    const initialComment = `/** Outdated brief comment */`;
    const initialResult = injector.injectDocComment(sampleSource, "formatCurrency", initialComment, "order.ts");
    assert.strictEqual(initialResult.success, true);
    assert.ok(initialResult.modifiedContent.includes("Outdated brief comment"));

    const newComment = `
/**
 * Formats numeric monetary amounts into standard USD currency string.
 * @param amount Numeric value
 * @returns Formatted currency string
 */
`.trim();

    const rerollResult = injector.injectDocComment(
      initialResult.modifiedContent,
      "formatCurrency",
      newComment,
      "order.ts",
    );

    assert.strictEqual(rerollResult.success, true);
    assert.ok(rerollResult.modifiedContent.includes("Formats numeric monetary amounts"));
    // The previous outdated comment should be replaced, not duplicated
    assert.strictEqual(rerollResult.modifiedContent.includes("Outdated brief comment"), false);
  });

  it("should return error when attempting to inject comment for nonexistent function", () => {
    const result = injector.injectDocComment(sampleSource, "nonExistentFunction", "/** note */", "order.ts");
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes("Target function 'nonExistentFunction' not found"));
  });

  it("should normalize plain-text commentary into well-formed JSDoc format", () => {
    const plainText = "Decouples the tax calculation from billing.\nExplains the why and how.";
    const formatted = injector.normalizeDocComment(plainText, "  ");
    assert.ok(formatted.startsWith("  /**"));
    assert.ok(formatted.includes("  * Decouples the tax calculation from billing."));
    assert.ok(formatted.includes("  * Explains the why and how."));
    assert.ok(formatted.endsWith("  */"));
  });
});
