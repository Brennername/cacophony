import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { ReviewVerdictParser } from "../gitea/AutomatedPrReviewLoop.js";

describe("ReviewVerdictParser Test Suite", () => {
  test("should parse JSON verdict format correctly", () => {
    const input = '{"verdict": "APPROVE", "reviewNotes": "All checks passed", "comments": []}';
    const result = ReviewVerdictParser.parse(input);
    assert.equal(result.verdict, "APPROVE");
    assert.equal(result.reviewNotes, "All checks passed");
    assert.deepEqual(result.comments, []);
  });

  test("should parse markdown/plain text containing APPROVE", () => {
    const input = "I have reviewed this patch and VERDICT: APPROVE. Looks solid.";
    const result = ReviewVerdictParser.parse(input);
    assert.equal(result.verdict, "APPROVE");
  });

  test("should parse REQUEST_CHANGES in JSON format", () => {
    const input = JSON.stringify({
      verdict: "REQUEST_CHANGES",
      reviewNotes: "Missing unit tests",
      comments: [{ path: "test.ts", lineNumber: 10, comment: "Add assertion", severity: "warning" }]
    });
    const result = ReviewVerdictParser.parse(input);
    assert.equal(result.verdict, "REQUEST_CHANGES");
    assert.equal(result.reviewNotes, "Missing unit tests");
    assert.equal(result.comments.length, 1);
  });

  test("should handle missing comments or unexpected format gracefully", () => {
    const input = "Random text without explicit verdict keyword";
    const result = ReviewVerdictParser.parse(input);
    assert.equal(result.verdict, "REQUEST_CHANGES");
    assert.ok(result.reviewNotes.length > 0);
  });
});