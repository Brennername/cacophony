import test from "node:test";
import assert from "node:assert/strict";
import { ReviewerPersonaPromptFactory } from "../inference/ReviewerPersonaPromptFactory.js";

test("ReviewerPersonaPromptFactory Suite (T94.1.2)", async (t) => {
  await t.test("generates domain-tailored system instructions for each persona", () => {
    const secPrompt = ReviewerPersonaPromptFactory.createSystemPrompt("SecurityAuditor");
    assert.ok(secPrompt.includes("SecurityAuditor"));
    assert.ok(secPrompt.includes("secrets"));
    assert.ok(secPrompt.includes("injection"));

    const archPrompt = ReviewerPersonaPromptFactory.createSystemPrompt("ArchitectureAuditor");
    assert.ok(archPrompt.includes("ArchitectureAuditor"));
    assert.ok(archPrompt.includes("SOLID"));
    assert.ok(archPrompt.includes("coupling"));

    const dxPrompt = ReviewerPersonaPromptFactory.createSystemPrompt("DxUxAuditor");
    assert.ok(dxPrompt.includes("DxUxAuditor"));
    assert.ok(dxPrompt.includes("mobile-first"));
    assert.ok(dxPrompt.includes("strict TypeScript typing"));
  });

  await t.test("creates user evaluation prompt containing task and diff context", () => {
    const prompt = ReviewerPersonaPromptFactory.createUserPrompt("SecurityAuditor", {
      taskId: "task-123",
      taskTitle: "Add payment gateway",
      taskPrompt: "Integrate Stripe API with secret key verification",
      diffText: "+ const apiKey = 'sk_live_12345';",
      focusFiles: ["src/pay.ts"],
    });

    assert.ok(prompt.includes("task-123"));
    assert.ok(prompt.includes("Add payment gateway"));
    assert.ok(prompt.includes("sk_live_12345"));
    assert.ok(prompt.includes("src/pay.ts"));
  });

  await t.test("parses structured JSON verdict with blocker finding forcing REQUEST_CHANGES", () => {
    const rawOutput = JSON.stringify({
      verdict: "APPROVE", // Even if model says APPROVE, blocker must override
      summary: "Found exposed secret",
      findings: [
        {
          path: "src/pay.ts",
          lineNumber: 10,
          ruleId: "NO_HARDCODED_SECRETS",
          severity: "blocker",
          message: "Hardcoded production API key found",
          suggestion: "Move key to process.env.STRIPE_KEY",
        },
      ],
    });

    const result = ReviewerPersonaPromptFactory.parsePersonaResponse(
      rawOutput,
      "SecurityAuditor"
    );

    assert.equal(result.persona, "SecurityAuditor");
    assert.equal(result.verdict, "REQUEST_CHANGES");
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0]!.severity, "blocker");
    assert.equal(result.findings[0]!.ruleId, "NO_HARDCODED_SECRETS");
  });

  await t.test("parses clean approval JSON output", () => {
    const rawOutput = JSON.stringify({
      verdict: "APPROVE",
      summary: "All SOLID guidelines adhered to cleanly",
      findings: [],
    });

    const result = ReviewerPersonaPromptFactory.parsePersonaResponse(
      rawOutput,
      "ArchitectureAuditor"
    );

    assert.equal(result.persona, "ArchitectureAuditor");
    assert.equal(result.verdict, "APPROVE");
    assert.equal(result.findings.length, 0);
  });
});
