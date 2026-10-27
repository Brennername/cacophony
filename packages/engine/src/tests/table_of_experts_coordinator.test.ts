import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TableOfExpertsCoordinator,
  type TableOfExpertsEvaluationContext,
  type ExpertScorecard,
} from "../inference/TableOfExpertsCoordinator.js";
import { MultiModelReviewCoordinator } from "../inference/MultiModelReviewCoordinator.js";
import type { IInferenceProvider } from "../inference/IInferenceProvider.js";
import type { InferenceRequest, InferenceResponse } from "@cacophony/shared-types";

class MockInferenceProvider implements IInferenceProvider {
  public responses: Map<string, string> = new Map();
  public defaultResponse: string = JSON.stringify({
    score: 85,
    verdict: "APPROVE",
    summary: "Mock analysis approved without blockers.",
    shoutVolume: 0.3,
    identifiedRisks: [],
    recommendedRemediations: [],
  });
  public capturedRequests: InferenceRequest[] = [];

  public getProviderType() {
    return "ollama" as const;
  }

  public async generate(request: InferenceRequest): Promise<InferenceResponse> {
    this.capturedRequests.push(request);
    const content = this.responses.get(request.model) || this.defaultResponse;
    return {
      content,
      model: request.model,
      tokensPrompt: 50,
      tokensCompletion: 50,
      totalTokens: 100,
      latencyMs: 15,
      tokensPerSec: 33.3,
    };
  }

  public async stream(
    request: InferenceRequest,
    onChunk: (chunk: string) => void,
  ): Promise<InferenceResponse> {
    const res = await this.generate(request);
    onChunk(res.content);
    return res;
  }
}

describe("TableOfExpertsCoordinator (Pandemonium Architecture) Suite", () => {
  it("provides 4 default expert definitions across key engineering axes", () => {
    const provider = new MockInferenceProvider();
    const coordinator = new TableOfExpertsCoordinator({
      inferenceProvider: provider,
      defaultModel: "deepseek-coder-v2:16b",
      fallbackModel: "qwen2.5-coder:7b",
    });

    const defs = coordinator.getExpertDefinitions();
    assert.equal(defs.length, 4);

    const domains = defs.map((d) => d.domain);
    assert.ok(domains.includes("implementation"));
    assert.ok(domains.includes("security"));
    assert.ok(domains.includes("dx_ux"));
    assert.ok(domains.includes("architecture"));
  });

  it("resolves model per domain via options, environment variables, or defaults", () => {
    const provider = new MockInferenceProvider();
    const coordinator = new TableOfExpertsCoordinator({
      inferenceProvider: provider,
      expertModels: {
        security: "custom-security-model:latest",
      },
      defaultModel: "base-default:14b",
      fallbackModel: "base-fallback:7b",
    });

    // Explicit option takes precedence
    assert.equal(
      coordinator.resolveModelForDomain("security", "default-fallback"),
      "custom-security-model:latest",
    );

    // Unspecified option falls back to provided default
    assert.equal(
      coordinator.resolveModelForDomain("implementation", "default-fallback"),
      "default-fallback",
    );
  });

  it("parses valid JSON scorecard and computes boosted shout volume on critical risk", () => {
    const provider = new MockInferenceProvider();
    const coordinator = new TableOfExpertsCoordinator({
      inferenceProvider: provider,
    });

    const def = coordinator.getExpertDefinitions().find((d) => d.domain === "security")!;
    const mockOutput = JSON.stringify({
      score: 25,
      verdict: "REQUEST_CHANGES",
      summary: "Potential command injection in subprocess spawn arguments.",
      shoutVolume: 0.4, // Will be boosted by presence of critical risk
      identifiedRisks: [
        {
          severity: "critical",
          message: "Unescaped user input passed to child_process.exec",
          location: { path: "src/runner.ts", line: 42 },
        },
      ],
      recommendedRemediations: [
        {
          priority: "critical",
          description: "Use child_process.execFile with argument array instead of exec",
          proposedFix: "execFile('tool', [args])",
        },
      ],
    });

    const scorecard = coordinator.parseExpertScorecard(def, "deepseek-coder-v2:16b", mockOutput, 120);

    assert.equal(scorecard.domain, "security");
    assert.equal(scorecard.score, 25);
    assert.equal(scorecard.verdict, "REQUEST_CHANGES");
    assert.equal(scorecard.shoutVolume, 1.0); // Boosted to 1.0 on critical risk
    assert.equal(scorecard.identifiedRisks.length, 1);
    assert.equal(scorecard.identifiedRisks[0]!.severity, "critical");
    assert.equal(scorecard.recommendedRemediations.length, 1);
  });

  it("falls back gracefully when model returns unparseable text with rejection keywords", () => {
    const provider = new MockInferenceProvider();
    const coordinator = new TableOfExpertsCoordinator({
      inferenceProvider: provider,
    });

    const def = coordinator.getExpertDefinitions().find((d) => d.domain === "architecture")!;
    const textOutput = "I find this diff unacceptable: CRITICAL VIOLATION of single responsibility principle!";

    const scorecard = coordinator.parseExpertScorecard(def, "deepseek-coder-v2:16b", textOutput, 80);

    assert.equal(scorecard.verdict, "REQUEST_CHANGES");
    assert.equal(scorecard.score, 45);
    assert.equal(scorecard.shoutVolume, 0.9);
    assert.ok(scorecard.identifiedRisks.length > 0);
  });

  it("preserves dissenting opinions and highlights conflicting signals instead of averaging them away", () => {
    const provider = new MockInferenceProvider();
    const coordinator = new TableOfExpertsCoordinator({
      inferenceProvider: provider,
    });

    const scorecards: ExpertScorecard[] = [
      {
        domain: "implementation",
        expertName: "Implementation Specialist",
        modelUsed: "deepseek-coder-v2:16b",
        score: 95,
        verdict: "APPROVE",
        summary: "Code executes cleanly with proper unit test assertions.",
        shoutVolume: 0.2,
        identifiedRisks: [],
        recommendedRemediations: [],
        durationMs: 100,
      },
      {
        domain: "security",
        expertName: "Security/Vulnerability Auditor",
        modelUsed: "qwen2.5-coder:7b",
        score: 30,
        verdict: "REQUEST_CHANGES",
        summary: "Command injection vulnerability detected.",
        shoutVolume: 1.0,
        identifiedRisks: [
          {
            severity: "critical",
            message: "Direct shell concatenation allows remote command execution",
            location: { path: "src/exec.ts", line: 15 },
          },
        ],
        recommendedRemediations: [],
        durationMs: 120,
      },
      {
        domain: "dx_ux",
        expertName: "DX/UX Usability Critic",
        modelUsed: "qwen2.5-coder:7b",
        score: 90,
        verdict: "APPROVE",
        summary: "Layout complies with mobile-first viewport rules.",
        shoutVolume: 0.1,
        identifiedRisks: [],
        recommendedRemediations: [],
        durationMs: 90,
      },
      {
        domain: "architecture",
        expertName: "Architecture & SOLID Auditor",
        modelUsed: "deepseek-coder-v2:16b",
        score: 85,
        verdict: "APPROVE",
        summary: "Adheres to SOLID interfaces.",
        shoutVolume: 0.2,
        identifiedRisks: [],
        recommendedRemediations: [],
        durationMs: 110,
      },
    ];

    const pandemonium = coordinator.synthesizePandemonium(scorecards, 420);

    // Assert that the critical security dissent is NOT buried by the 3 approvals
    assert.equal(pandemonium.highestRiskSeverity, "critical");
    assert.equal(pandemonium.compositeVerdict, "REQUEST_CHANGES");
    assert.ok(pandemonium.conflictingSignals.length > 0);
    assert.ok(
      pandemonium.conflictingSignals.some((sig) =>
        sig.includes("Security/Vulnerability Auditor shouted REQUEST_CHANGES"),
      ),
    );
    assert.ok(
      pandemonium.topDissentingConcerns.some((concern) =>
        concern.includes("Direct shell concatenation"),
      ),
    );
    assert.equal(pandemonium.domainScores.implementation, 95);
    assert.equal(pandemonium.domainScores.security, 30);
  });

  it("yields SPLIT_DECISION when experts disagree without critical blockers", () => {
    const provider = new MockInferenceProvider();
    const coordinator = new TableOfExpertsCoordinator({
      inferenceProvider: provider,
    });

    const scorecards: ExpertScorecard[] = [
      {
        domain: "implementation",
        expertName: "Implementation Specialist",
        modelUsed: "model-a",
        score: 92,
        verdict: "APPROVE",
        summary: "Algorithm meets requirements.",
        shoutVolume: 0.2,
        identifiedRisks: [],
        recommendedRemediations: [],
        durationMs: 50,
      },
      {
        domain: "dx_ux",
        expertName: "DX/UX Usability Critic",
        modelUsed: "model-b",
        score: 55,
        verdict: "REQUEST_CHANGES",
        summary: "Button tap target is below 48px on mobile.",
        shoutVolume: 0.8,
        identifiedRisks: [
          {
            severity: "medium",
            message: "Tap target too small for mobile touch standards",
          },
        ],
        recommendedRemediations: [],
        durationMs: 60,
      },
    ];

    const pandemonium = coordinator.synthesizePandemonium(scorecards, 110);
    assert.equal(pandemonium.compositeVerdict, "SPLIT_DECISION");
    assert.equal(pandemonium.highestRiskSeverity, "medium");
    assert.ok(pandemonium.conflictingSignals.length > 0);
  });

  it("evaluates a diff across all experts via evaluateDiff", async () => {
    const provider = new MockInferenceProvider();
    const coordinator = new TableOfExpertsCoordinator({
      inferenceProvider: provider,
    });

    const context: TableOfExpertsEvaluationContext = {
      taskId: "task-exp-01",
      taskTitle: "Refactor Authentication Token Verification",
      diff: "diff --git a/auth.ts b/auth.ts\n+ export function verifyToken() { return true; }",
      focusFiles: "packages/engine/src/auth/auth.ts",
    };

    const feedback = await coordinator.evaluateDiff(context);

    assert.equal(feedback.scorecards.length, 4);
    assert.equal(feedback.compositeVerdict, "APPROVE");
    assert.equal(provider.capturedRequests.length, 4);
  });

  it("integrates seamlessly into MultiModelReviewCoordinator.evaluateWithTableOfExperts", async () => {
    const provider = new MockInferenceProvider();
    const reviewCoordinator = new MultiModelReviewCoordinator({
      inferenceProvider: provider,
      defaultModel: "deepseek-coder-v2:16b",
      fallbackModel: "qwen2.5-coder:7b",
    });

    const feedback = await reviewCoordinator.evaluateWithTableOfExperts({
      taskId: "task-exp-int-02",
      taskTitle: "Integrate Table of Experts",
      diff: "+ const table = new TableOfExpertsCoordinator();",
    });

    assert.equal(feedback.scorecards.length, 4);
    assert.equal(feedback.compositeVerdict, "APPROVE");
    assert.ok(feedback.totalDurationMs >= 0);
  });
});
