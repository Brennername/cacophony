import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ComplianceReviewStage } from "../scheduler/ComplianceReviewStage.js";
import type { TaskAdvisoryGuidance, ComplianceReviewResult } from "@cacophony/shared-types";
import type { IInferenceProvider } from "../inference/IInferenceProvider.js";

describe("T-S13.5: ComplianceReviewStage and Advisory Gating", () => {
  const dummyGuidance: readonly TaskAdvisoryGuidance[] = [
    {
      id: "adv-1",
      taskId: "task-001",
      author: "Operator",
      commentText: "Use non-destructive comment injection and avoid modifying functions.",
      advisoryType: "CONSTRAINT",
      requiresComplianceAudit: true,
      createdAt: new Date().toISOString(),
    },
  ];

  it("should return COMPLIANT when no advisory guidance is attached to task", async () => {
    const stage = new ComplianceReviewStage();
    const result = await stage.auditCompliance({
      taskId: "task-001",
      targetBranch: "main",
      diff: "diff --git a/file.ts b/file.ts",
      guidanceList: [],
      reviewerModel: "qwen2.5-coder:7b",
    });

    assert.equal(result.verdict, "COMPLIANT");
    assert.equal(result.isPausedForAdvisory, false);
    assert.equal(result.advisoryItems.length, 0);
  });

  it("should parse structured LLM compliance output and identify ADVISORY_QUESTION", async () => {
    const mockInference: IInferenceProvider = {
      modelId: "qwen2.5-coder:7b-instruct-q4_K_M",
      generate: async () => ({
        content: JSON.stringify({
          verdict: "ADVISORY_QUESTION",
          notes: "Implementation complies with core logic, but question remains on whether async functions need JSDoc tags.",
          items: [
            {
              title: "Use non-destructive comment injection",
              satisfied: true,
              feedback: "Injection verified without modifying code lines.",
              severity: "info",
            },
            {
              title: "Async return type documentation",
              satisfied: false,
              feedback: "Consider adding explicit Promise return tags if needed.",
              severity: "warning",
            },
          ],
        }),
        tokensPrompt: 100,
        tokensCompletion: 50,
        totalTokens: 150,
        latencyMs: 120,
        tokensPerSec: 40,
      }),
    } as any;

    const stage = new ComplianceReviewStage(mockInference, {
      cooldownWindowMs: 300000,
    });

    const result = await stage.auditCompliance({
      taskId: "task-001",
      targetBranch: "main",
      diff: "diff --git a/test.ts b/test.ts",
      guidanceList: dummyGuidance,
      reviewerModel: "qwen2.5-coder:7b",
    });

    assert.equal(result.verdict, "ADVISORY_QUESTION");
    assert.equal(result.isPausedForAdvisory, true);
    assert.ok(result.cooldownEndsAt);
    assert.equal(result.advisoryItems.length, 2);
  });

  it("should block merge when PR verification tests fail regardless of compliance", () => {
    const stage = new ComplianceReviewStage();
    const compliance: ComplianceReviewResult = {
      verdict: "COMPLIANT",
      notes: "Fully compliant.",
      advisoryItems: [],
      isPausedForAdvisory: false,
    };

    const decision = stage.evaluateMergeReadiness({
      complianceResult: compliance,
      prTestsPassed: false,
    });

    assert.equal(decision.canMerge, false);
    assert.ok(decision.reason.includes("tests failed"));
  });

  it("should block merge when non-compliant with operator guidance", () => {
    const stage = new ComplianceReviewStage();
    const compliance: ComplianceReviewResult = {
      verdict: "NON_COMPLIANT",
      notes: "Modified function implementation directly in violation of constraint.",
      advisoryItems: [],
      isPausedForAdvisory: false,
    };

    const decision = stage.evaluateMergeReadiness({
      complianceResult: compliance,
      prTestsPassed: true,
    });

    assert.equal(decision.canMerge, false);
    assert.ok(decision.reason.includes("non-compliant"));
  });

  it("should pause merge during advisory question cooldown window", () => {
    const cooldownMs = 60000;
    const stage = new ComplianceReviewStage(undefined, { cooldownWindowMs: cooldownMs });
    const compliance: ComplianceReviewResult = {
      verdict: "ADVISORY_QUESTION",
      notes: "Minor suggestion raised.",
      advisoryItems: [],
      isPausedForAdvisory: true,
    };

    const pausedAt = new Date().toISOString();
    const decision = stage.evaluateMergeReadiness({
      complianceResult: compliance,
      prTestsPassed: true,
      pausedAt,
    });

    assert.equal(decision.canMerge, false);
    assert.equal(decision.isPaused, true);
    assert.ok(decision.cooldownRemainingMs !== undefined && decision.cooldownRemainingMs > 0);
  });

  it("should hold PR when operator intervenes during advisory pause", () => {
    const cooldownMs = 60000;
    const stage = new ComplianceReviewStage(undefined, { cooldownWindowMs: cooldownMs });
    const compliance: ComplianceReviewResult = {
      verdict: "ADVISORY_QUESTION",
      notes: "Minor suggestion raised.",
      advisoryItems: [],
      isPausedForAdvisory: true,
    };

    const pausedAt = new Date(Date.now() - 10000).toISOString();
    const operatorInteractionAt = new Date().toISOString();

    const decision = stage.evaluateMergeReadiness({
      complianceResult: compliance,
      prTestsPassed: true,
      pausedAt,
      lastOperatorInteractionAt: operatorInteractionAt,
    });

    assert.equal(decision.canMerge, false);
    assert.equal(decision.isPaused, true);
    assert.ok(decision.reason.includes("Operator intervention registered"));
  });

  it("should automatically proceed with merge after cooldown window elapses without intervention", () => {
    const cooldownMs = 60000;
    const stage = new ComplianceReviewStage(undefined, { cooldownWindowMs: cooldownMs });
    const compliance: ComplianceReviewResult = {
      verdict: "ADVISORY_QUESTION",
      notes: "Minor suggestion raised.",
      advisoryItems: [],
      isPausedForAdvisory: true,
    };

    // Paused 70 seconds ago (cooldown is 60s)
    const pausedAt = new Date(Date.now() - 70000).toISOString();

    const decision = stage.evaluateMergeReadiness({
      complianceResult: compliance,
      prTestsPassed: true,
      pausedAt,
    });

    assert.equal(decision.canMerge, true);
    assert.equal(decision.autoMergedAfterCooldown, true);
    assert.ok(decision.reason.includes("elapsed with no operator intervention"));
  });
});
