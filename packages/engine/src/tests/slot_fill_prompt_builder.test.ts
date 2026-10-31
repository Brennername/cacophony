import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SlotFillPromptBuilder } from "../refactoring/SlotFillPromptBuilder.js";
import type { AssessmentFinding } from "@cacophony/shared-types";

describe("SlotFillPromptBuilder", () => {
  const sampleSource = `
    export class OrderProcessor {
      private totalOrders = 0;

      public validateOrder(orderId: string): boolean {
        return orderId.length > 0;
      }

      public processOrder(orderId: string, amount: number): boolean {
        const valid = this.validateOrder(orderId);
        if (!valid) return false;
        this.totalOrders++;
        return true;
      }
    }
  `;

  test("should successfully construct targeted prompt for existing method", () => {
    const result = SlotFillPromptBuilder.buildSlotFillPrompt({
      source: sampleSource,
      fileName: "OrderProcessor.ts",
      className: "OrderProcessor",
      methodName: "processOrder",
      directive: "Validate amount is positive before incrementing order count",
    });

    assert.equal(result.success, true);
    assert.ok(result.prompt);
    assert.equal(result.validation.valid, true);

    const prompt = result.prompt;
    assert.ok(prompt.includes("### [AST-TARGETED METHOD REPAIR]"));
    assert.ok(prompt.includes("FILE: `OrderProcessor.ts`"));
    assert.ok(prompt.includes("TARGET: `OrderProcessor.processOrder`"));
    assert.ok(prompt.includes("#### Class Member Contracts"));
    assert.ok(prompt.includes("validateOrder(orderId: string): boolean"));
    assert.ok(prompt.includes("#### Target Signature"));
    assert.ok(prompt.includes("processOrder(orderId: string, amount: number): boolean"));
    assert.ok(prompt.includes("#### Objective & Directives"));
    assert.ok(prompt.includes("Validate amount is positive"));
    assert.ok(prompt.includes("#### Generation Constraints"));
  });

  test("should embed reviewer findings into prompt sections when provided", () => {
    const findings: AssessmentFinding[] = [
      {
        id: "finding-1",
        path: "OrderProcessor.ts",
        category: "security",
        severity: "high",
        message: "Missing bounds check on monetary value",
        deterministicFixHint: "Ensure amount > 0",
      },
    ];

    const result = SlotFillPromptBuilder.buildSlotFillPrompt({
      source: sampleSource,
      fileName: "OrderProcessor.ts",
      className: "OrderProcessor",
      methodName: "processOrder",
      directive: "Fix security vulnerabilities",
      findings,
    });

    assert.equal(result.success, true);
    assert.ok(result.prompt);
    assert.ok(result.prompt.includes("#### Reviewer Findings Addressed"));
    assert.ok(result.prompt.includes("- [HIGH] `security`: Missing bounds check"));
    assert.ok(result.prompt.includes("Deterministic Fix Hint: Ensure amount > 0"));
  });

  test("should fail with validation error when target method does not exist", () => {
    const result = SlotFillPromptBuilder.buildSlotFillPrompt({
      source: sampleSource,
      fileName: "OrderProcessor.ts",
      className: "OrderProcessor",
      methodName: "nonExistentMethod",
      directive: "Fix nonexistent method",
    });

    assert.equal(result.success, false);
    assert.equal(result.prompt, undefined);
    assert.equal(result.validation.valid, false);
    assert.ok(result.reason);
  });

  test("should fail with validation error when target class does not exist", () => {
    const result = SlotFillPromptBuilder.buildSlotFillPrompt({
      source: sampleSource,
      fileName: "OrderProcessor.ts",
      className: "MissingClass",
      methodName: "processOrder",
      directive: "Fix missing class",
    });

    assert.equal(result.success, false);
    assert.equal(result.prompt, undefined);
    assert.equal(result.validation.valid, false);
  });
});
