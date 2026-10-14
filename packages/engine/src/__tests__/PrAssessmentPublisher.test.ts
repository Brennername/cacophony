import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PrAssessmentPublisher } from "../gitea/PrAssessmentPublisher.js";
import type { GiteaApiClient } from "../gitea/GiteaApiClient.js";
import type { ReviewReportRepository } from "@cacophony/db";
import type { StructuredAssessmentReport } from "@cacophony/shared-types";

describe("T88.2.3: PrAssessmentPublisher PR Timeline Publication", () => {
  const dummyReport: StructuredAssessmentReport = {
    id: "rep-pub-1",
    workItemId: "wi-pub-8823",
    round: 1,
    prId: 42,
    headSha: "abcdef1234567890",
    modelIdentity: "deepseek-r1:8b",
    verdict: "REQUEST_CHANGES",
    summary: "Found blocker in validation and critical in boundary check",
    findings: [
      {
        id: "f-1",
        category: "correctness",
        severity: "blocker",
        path: "src/auth/guard.ts",
        lineNumber: 88,
        message: "Missing token expiry check",
        deterministicFixHint: "if (Date.now() > token.expiresAt) throw new Error()",
        rationale: "Prevents replay attack",
      },
    ],
    ciOutcome: "success",
    createdAt: new Date().toISOString(),
  };

  test("should publish structured review with inline comments and persist report", async () => {
    let reviewSubmittedWith: any = null;
    let persistedReport: any = null;

    const mockGiteaClient: Partial<GiteaApiClient> = {
      submitPullRequestReview: async (_owner, _repo, _pr, review) => {
        reviewSubmittedWith = review;
      },
    };

    const mockReportRepo: Partial<ReviewReportRepository> = {
      saveReport: async (rep) => {
        persistedReport = rep;
        return rep;
      },
    };

    const publisher = new PrAssessmentPublisher(
      mockGiteaClient as GiteaApiClient,
      mockReportRepo as ReviewReportRepository,
    );

    const result = await publisher.publishPrAssessment({
      owner: "NeXeN",
      repo: "cacophony",
      prNumber: 42,
      report: dummyReport,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.reviewSubmitted, true);
    assert.strictEqual(result.blockerCount, 1);
    assert.strictEqual(result.persisted, true);
    assert.ok(reviewSubmittedWith);
    assert.strictEqual(reviewSubmittedWith.event, "REQUEST_CHANGES");
    assert.strictEqual(reviewSubmittedWith.comments.length, 1);
    assert.strictEqual(reviewSubmittedWith.comments[0].path, "src/auth/guard.ts");
    assert.strictEqual(reviewSubmittedWith.comments[0].line, 88);
    assert.strictEqual(persistedReport.id, "rep-pub-1");
  });

  test("should fallback to issue comment if review submission throws", async () => {
    let commentPostedBody = "";

    const mockGiteaClient: Partial<GiteaApiClient> = {
      submitPullRequestReview: async () => {
        throw new Error("422 Unprocessable: Cannot approve own pull request");
      },
      createIssueComment: async (_owner, _repo, _pr, comment) => {
        commentPostedBody = comment.body;
        return {} as any;
      },
    };

    const publisher = new PrAssessmentPublisher(
      mockGiteaClient as GiteaApiClient,
    );

    const result = await publisher.publishPrAssessment({
      owner: "NeXeN",
      repo: "cacophony",
      prNumber: 42,
      report: dummyReport,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.reviewSubmitted, false);
    assert.strictEqual(result.commentPosted, true);
    assert.ok(commentPostedBody.includes("Independent PR Assessment"));
    assert.ok(commentPostedBody.includes("Missing token expiry check"));
  });
});
