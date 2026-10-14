import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AssessmentPolicy } from "../gitea/AssessmentPolicy.js";
import type { StructuredAssessmentReport } from "@cacophony/shared-types";

describe("T88.3: AssessmentPolicy Multi-Model Merge Gate Evaluation", () => {
  const policy = new AssessmentPolicy({ minIndependentReviewers: 2, requirePassingCi: true });

  const approveReport1: StructuredAssessmentReport = {
    id: "rep-1",
    workItemId: "wi-8830",
    round: 1,
    prId: 10,
    headSha: "head12345678",
    modelIdentity: "deepseek-r1:8b",
    verdict: "APPROVE",
    summary: "Clean architecture, tests verified",
    findings: [],
    ciOutcome: "success",
    createdAt: new Date().toISOString(),
  };

  const approveReport2: StructuredAssessmentReport = {
    id: "rep-2",
    workItemId: "wi-8830",
    round: 1,
    prId: 10,
    headSha: "head12345678",
    modelIdentity: "qwen2.5-coder:14b",
    verdict: "APPROVE",
    summary: "TypeScript types solid and sound",
    findings: [
      {
        id: "f-1",
        category: "solid_principles",
        severity: "medium",
        path: "src/utils.ts",
        lineNumber: 15,
        message: "Consider extracting helper function",
      },
    ],
    ciOutcome: "success",
    createdAt: new Date().toISOString(),
  };

  test("T88.3.1: should require at least two independent reviews for code-modifying PRs", () => {
    // Only one review provided
    const resSingle = policy.evaluate({
      reports: [approveReport1],
      ciStatus: "success",
      isCodeModifying: true,
      authorModel: "qwen2.5-coder:7b",
    });

    assert.strictEqual(resSingle.eligible, false);
    assert.ok(resSingle.reasons.some((r) => r.includes("Insufficient independent model reviews")));

    // Two independent reviews provided
    const resDouble = policy.evaluate({
      reports: [approveReport1, approveReport2],
      ciStatus: "success",
      isCodeModifying: true,
      authorModel: "qwen2.5-coder:7b",
    });

    assert.strictEqual(resDouble.eligible, true);
    assert.strictEqual(resDouble.approvedCount, 2);
    assert.strictEqual(resDouble.reasons.length, 0);
  });

  test("T88.3.1: should reject review submitted by PR author model", () => {
    // author is deepseek-r1:8b, so report1 must be discounted
    const res = policy.evaluate({
      reports: [approveReport1, approveReport2],
      ciStatus: "success",
      isCodeModifying: true,
      authorModel: "deepseek-r1:8b",
    });

    assert.strictEqual(res.eligible, false);
    assert.strictEqual(res.approvedCount, 1);
  });

  test("T88.3.2: should block auto-merge if any critical or blocker finding exists", () => {
    const reportWithCritical: StructuredAssessmentReport = {
      ...approveReport2,
      id: "rep-crit",
      verdict: "APPROVE",
      findings: [
        {
          id: "f-crit",
          category: "security",
          severity: "critical",
          path: "src/auth.ts",
          lineNumber: 42,
          message: "Potential token exposure",
        },
      ],
    };

    const res = policy.evaluate({
      reports: [approveReport1, reportWithCritical],
      ciStatus: "success",
      isCodeModifying: true,
      authorModel: "qwen2.5-coder:7b",
    });

    assert.strictEqual(res.eligible, false);
    assert.strictEqual(res.criticalFindingCount, 1);
    assert.ok(res.reasons.some((r) => r.includes("[CRITICAL]")));
  });

  test("T88.3.2: should block auto-merge if any reviewer requests changes", () => {
    const reportRequestChanges: StructuredAssessmentReport = {
      ...approveReport2,
      id: "rep-rc",
      verdict: "REQUEST_CHANGES",
      summary: "Missing edge case tests for null input",
    };

    const res = policy.evaluate({
      reports: [approveReport1, reportRequestChanges],
      ciStatus: "success",
      isCodeModifying: true,
      authorModel: "qwen2.5-coder:7b",
    });

    assert.strictEqual(res.eligible, false);
    assert.ok(res.reasons.some((r) => r.includes("requested changes")));
  });

  test("should block auto-merge if CI status check is failing", () => {
    const res = policy.evaluate({
      reports: [approveReport1, approveReport2],
      ciStatus: "failure",
      isCodeModifying: true,
      authorModel: "qwen2.5-coder:7b",
    });

    assert.strictEqual(res.eligible, false);
    assert.ok(res.reasons.some((r) => r.includes("CI status check is not passing")));
  });
});
