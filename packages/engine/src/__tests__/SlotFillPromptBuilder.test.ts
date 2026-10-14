import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SlotFillPromptBuilder } from "../refactoring/SlotFillPromptBuilder.js";
import type { AssessmentFinding } from "@cacophony/shared-types";

describe("T88.5.3: SlotFillPromptBuilder AST-Targeted Single Method Generation", () => {
  const sampleSource = `
export class PaymentProcessor {
  private readonly gatewayUrl: string;

  constructor(gatewayUrl: string) {
    this.gatewayUrl = gatewayUrl;
  }

  public async charge(amount: number, token: string): Promise<boolean> {
    return false;
  }
}
`;

  test("should build targeted slot-fill prompt when AST preconditions pass", () => {
    const finding: AssessmentFinding = {
      id: "f-101",
      path: "PaymentProcessor.ts",
      lineNumber: 10,
      category: "correctness",
      severity: "critical",
      message: "Charge method returns false without invoking gateway",
      deterministicFixHint: "await fetch(this.gatewayUrl, { body: JSON.stringify({ amount, token }) })",
    };

    const res = SlotFillPromptBuilder.buildSlotFillPrompt({
      source: sampleSource,
      fileName: "PaymentProcessor.ts",
      className: "PaymentProcessor",
      methodName: "charge",
      directive: "Implement real payment gateway invocation with token authentication",
      findings: [finding],
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.prompt);
    assert.ok(res.prompt.includes("TARGET: `PaymentProcessor.charge`"));
    assert.ok(res.prompt.includes("gatewayUrl: string"));
    assert.ok(res.prompt.includes("Charge method returns false without invoking gateway"));
    assert.ok(res.prompt.includes("await fetch(this.gatewayUrl"));
    assert.ok(res.prompt.includes("Return ONLY the replacement code statements"));
  });

  test("should fail prompt generation when method does not exist in AST", () => {
    const res = SlotFillPromptBuilder.buildSlotFillPrompt({
      source: sampleSource,
      fileName: "PaymentProcessor.ts",
      className: "PaymentProcessor",
      methodName: "refund",
      directive: "Implement refund",
    });

    assert.strictEqual(res.success, false);
    assert.ok(res.reason?.includes("Target method 'refund' not found"));
  });
});
