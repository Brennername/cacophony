import test from "node:test";
import assert from "node:assert/strict";
import { ReviewOpinionSynthesizer } from "../inference/ReviewOpinionSynthesizer.js";
import { CandidateReviewExecution } from "../inference/MultiModelConsensusCoordinator.js";

test("ReviewOpinionSynthesizer Suite (T94.2.2)", async (t) => {
  const executions: CandidateReviewExecution[] = [
    {
      modelId: "qwen2.5-coder:14b",
      persona: "ArchitectureAuditor",
      latencyMs: 1200,
      result: {
        persona: "ArchitectureAuditor",
        verdict: "REQUEST_CHANGES",
        summary: "Architecture issue identified",
        findings: [
          {
            path: "src/api/auth.ts",
            lineNumber: 22,
            ruleId: "SOLID_SRP",
            severity: "warning",
            message: "Authentication handler mixing token issuance and billing logic",
            suggestion: "Separate billing into dedicated service",
          },
        ],
      },
    },
    {
      modelId: "deepseek-r1:8b",
      persona: "SecurityAuditor",
      latencyMs: 2500,
      result: {
        persona: "SecurityAuditor",
        verdict: "REQUEST_CHANGES",
        summary: "Security vulnerability found",
        findings: [
          {
            path: "src/api/auth.ts",
            lineNumber: 22,
            ruleId: "NO_SECRET_LOG",
            severity: "blocker",
            message: "Authentication handler mixing token issuance and billing logic",
            suggestion: "Sanitize logs before emission",
          },
        ],
      },
    },
    {
      modelId: "gemma3:4b-it-qat",
      persona: "DxUxAuditor",
      latencyMs: 800,
      result: {
        persona: "DxUxAuditor",
        verdict: "APPROVE",
        summary: "Clean TypeScript interfaces",
        findings: [],
      },
    },
  ];

  await t.test("deduplicates overlapping findings and elevates blocker severity", () => {
    const synthesis = ReviewOpinionSynthesizer.synthesize(executions);

    assert.equal(synthesis.consensusVerdict, "REQUEST_CHANGES");
    assert.equal(synthesis.approvalCount, 1);
    assert.equal(synthesis.requestChangesCount, 2);

    // Both models reported on auth.ts line 22 with identical core message
    assert.equal(synthesis.unifiedFindings.length, 1);
    const unified = synthesis.unifiedFindings[0]!;
    assert.equal(unified.severity, "blocker"); // elevated from warning to blocker
    assert.equal(unified.reportingModels.length, 2);
    assert.ok(unified.reportingPersonas.includes("ArchitectureAuditor"));
    assert.ok(unified.reportingPersonas.includes("SecurityAuditor"));
  });

  await t.test("generates actionable unified markdown review comment", () => {
    const synthesis = ReviewOpinionSynthesizer.synthesize(executions);
    const comment = synthesis.markdownComment;

    assert.ok(comment.includes("CHANGES REQUESTED"));
    assert.ok(comment.includes("1 Approvals / 2 Changes Requested"));
    assert.ok(comment.includes("ArchitectureAuditor"));
    assert.ok(comment.includes("SecurityAuditor"));
    assert.ok(comment.includes("DxUxAuditor"));
    assert.ok(comment.includes("`src/api/auth.ts:22`"));
    assert.ok(comment.includes("[BLOCKER]"));
  });

  await t.test("unanimous approval produces clean approval verdict", () => {
    const unanimousExecutions: CandidateReviewExecution[] = [
      {
        modelId: "qwen2.5-coder:14b",
        persona: "ArchitectureAuditor",
        latencyMs: 500,
        result: {
          persona: "ArchitectureAuditor",
          verdict: "APPROVE",
          summary: "Clean",
          findings: [],
        },
      },
      {
        modelId: "deepseek-r1:8b",
        persona: "SecurityAuditor",
        latencyMs: 600,
        result: {
          persona: "SecurityAuditor",
          verdict: "APPROVE",
          summary: "Clean",
          findings: [],
        },
      },
    ];

    const synthesis = ReviewOpinionSynthesizer.synthesize(unanimousExecutions);
    assert.equal(synthesis.consensusVerdict, "APPROVE");
    assert.equal(synthesis.approvalCount, 2);
    assert.equal(synthesis.requestChangesCount, 0);
    assert.ok(synthesis.markdownComment.includes("APPROVED"));
  });
});
