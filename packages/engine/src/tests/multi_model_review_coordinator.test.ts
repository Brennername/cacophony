import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import type { IInferenceProvider } from "../inference/IInferenceProvider.js";
import {
  MultiModelReviewCoordinator,
  type MultiModelReviewContext,
} from "../inference/MultiModelReviewCoordinator.js";

describe("T103.5: MultiModelReviewCoordinator Unit Tests", () => {
  function createMockInferenceProvider(behavior?: {
    failAttempts?: number;
    securityVerdict?: "APPROVE" | "REQUEST_CHANGES";
  }): IInferenceProvider & { calls: Array<{ model: string; promptSnippet: string }> } {
    let currentAttempt = 0;
    const calls: Array<{ model: string; promptSnippet: string }> = [];

    return {
      calls,
      getProviderType: () => "ollama",
      generate: async (req) => {
        calls.push({
          model: req.model,
          promptSnippet: req.messages[1]?.content?.slice(0, 50) || "",
        });

        if (behavior?.failAttempts && currentAttempt < behavior.failAttempts) {
          currentAttempt++;
          throw new Error("Simulated model inference timeout / rate limit");
        }

        const systemContent = req.messages[0]?.content || "";
        let role = "architecture";
        let verdict = "APPROVE";
        let score = 90;

        if (systemContent.includes("Security")) {
          role = "security";
          verdict = behavior?.securityVerdict || "APPROVE";
          score = verdict === "APPROVE" ? 95 : 40;
        } else if (systemContent.includes("DX")) {
          role = "dx_ux";
          verdict = "APPROVE";
          score = 88;
        }

        return {
          content: JSON.stringify({
            verdict,
            score,
            summary: `${role} review completed cleanly.`,
            findings:
              verdict === "REQUEST_CHANGES"
                ? [
                    {
                      severity: "critical",
                      path: "src/crypto/Token.ts",
                      lineNumber: 22,
                      message: "Weak PRNG used for security-critical token generation",
                      recommendation: "Use crypto.randomBytes instead of Math.random",
                    },
                  ]
                : [],
          }),
          model: req.model,
          tokensPrompt: 120,
          tokensCompletion: 80,
          totalTokens: 200,
          latencyMs: 150,
          tokensPerSec: 35,
        };
      },
      stream: async () => {
        throw new Error("stream not implemented in test");
      },
    };
  }

  it("should coordinate 3-role reviews and synthesize approval consensus", async () => {
    const mockProvider = createMockInferenceProvider();
    const coordinator = new MultiModelReviewCoordinator({
      inferenceProvider: mockProvider,
      defaultModel: "deepseek-r1:8b",
      fallbackModel: "qwen2.5-coder:7b-instruct-q4_K_M",
    });

    const context: MultiModelReviewContext = {
      taskId: "task-feat-100",
      taskTitle: "Refactor MemoryCache to support TTL sliding expiration",
      focusFiles: "src/cache/MemoryCache.ts",
      diff: "diff --git a/src/cache/MemoryCache.ts b/src/cache/MemoryCache.ts\n+public getWithSlidingExpiry() {}",
      testOutput: "PASS packages/engine/src/tests/cache.test.ts",
    };

    const consensus = await coordinator.coordinateReview(context, {
      generationMs: 4500,
      astScrubbingMs: 320,
      testExecutionMs: 1200,
      remediationMs: 0,
      prCreationMs: 800,
    });

    assert.strictEqual(consensus.overallVerdict, "APPROVE");
    assert.strictEqual(consensus.roleResults.length, 3);
    assert.ok(consensus.compositeScore >= 80);
    assert.strictEqual(mockProvider.calls.length, 3);

    // Verify sub-stage timing telemetry
    assert.strictEqual(consensus.timingMetrics.generationMs, 4500);
    assert.strictEqual(consensus.timingMetrics.astScrubbingMs, 320);
    assert.strictEqual(consensus.timingMetrics.testExecutionMs, 1200);
    assert.ok(consensus.timingMetrics.securityReviewMs >= 0);
    assert.ok(consensus.timingMetrics.dxUxReviewMs >= 0);
    assert.ok(consensus.timingMetrics.architectureReviewMs >= 0);
    assert.ok(consensus.timingMetrics.totalElapsedMs >= 6820);

    // Verify human-readable timing report contains all sub-stages
    assert.ok(consensus.timingSummary.includes("Model Code Generation"));
    assert.ok(consensus.timingSummary.includes("AST Scrubbing & Guardrails"));
    assert.ok(consensus.timingSummary.includes("Security Review"));
    assert.ok(consensus.timingSummary.includes("DX / UX / UI Review"));
    assert.ok(consensus.timingSummary.includes("Architecture & SOLID Review"));
  });

  it("should reject overall verdict when a specialized reviewer flags critical findings", async () => {
    const mockProvider = createMockInferenceProvider({
      securityVerdict: "REQUEST_CHANGES",
    });

    const coordinator = new MultiModelReviewCoordinator({
      inferenceProvider: mockProvider,
    });

    const context: MultiModelReviewContext = {
      taskId: "task-auth-200",
      taskTitle: "Implement session token generator",
      diff: "+const token = Math.random().toString(36);",
    };

    const consensus = await coordinator.coordinateReview(context);

    assert.strictEqual(consensus.overallVerdict, "REQUEST_CHANGES");
    assert.strictEqual(consensus.allFindings.length, 1);
    assert.strictEqual(consensus.allFindings[0]?.severity, "critical");
    assert.strictEqual(consensus.allFindings[0]?.role, "security_reviewer");

    // Check conversion to PR review comments
    const prComments = coordinator.toReviewComments(consensus.allFindings);
    assert.strictEqual(prComments.length, 1);
    assert.strictEqual(prComments[0]?.path, "src/crypto/Token.ts");
    assert.strictEqual(prComments[0]?.lineNumber, 22);
    assert.strictEqual(prComments[0]?.severity, "blocker");
    assert.ok(prComments[0]?.comment.includes("[SECURITY_REVIEWER]"));
  });

  it("should retry on reviewer failure and fall back to alternative model", async () => {
    const mockProvider = createMockInferenceProvider({
      failAttempts: 2,
    });

    const coordinator = new MultiModelReviewCoordinator({
      inferenceProvider: mockProvider,
      defaultModel: "deepseek-r1:8b",
      fallbackModel: "qwen2.5-coder:7b-instruct-q4_K_M",
      maxRetriesPerRole: 3,
    });

    const context: MultiModelReviewContext = {
      taskId: "task-retry-001",
      taskTitle: "Verify fallback recovery on transient failure",
      diff: "+console.log('test');",
    };

    const consensus = await coordinator.coordinateReview(context);

    // Initial 2 attempts failed on default model, then third succeeded on fallback model
    assert.ok(mockProvider.calls.length >= 3);
    const usedFallback = mockProvider.calls.some(
      (c) => c.model === "qwen2.5-coder:7b-instruct-q4_K_M",
    );
    assert.strictEqual(usedFallback, true);
    assert.strictEqual(consensus.overallVerdict, "APPROVE");
  });

  it("should format remediation compliance notes when prior actions are documented", async () => {
    const mockProvider = createMockInferenceProvider();
    const coordinator = new MultiModelReviewCoordinator({
      inferenceProvider: mockProvider,
    });

    const context: MultiModelReviewContext = {
      taskId: "task-remed-300",
      taskTitle: "Remediated SQL escaping",
      diff: "+db.query('SELECT * FROM users WHERE id = $1', [userId]);",
      priorRemediationActions: [
        "Replaced string interpolation with parameterized SQL query bindings ($1)",
        "Added unit test verifying SQL injection resistance",
      ],
    };

    const consensus = await coordinator.coordinateReview(context);

    assert.ok(consensus.complianceNotes);
    assert.ok(
      consensus.complianceNotes.includes(
        "Replaced string interpolation with parameterized SQL query bindings ($1)",
      ),
    );
    assert.ok(
      consensus.complianceNotes.includes(
        "Added unit test verifying SQL injection resistance",
      ),
    );
  });
});
