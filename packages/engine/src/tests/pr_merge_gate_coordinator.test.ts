import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PrMergeGateCoordinator } from "../scheduler/PrMergeGateCoordinator.js";

describe("T108.7: PrMergeGateCoordinator Unit Test Suite", () => {
  it("should evaluate shouldHoldPr and hold PR with custom or default domains", () => {
    const coordinator = new PrMergeGateCoordinator({
      defaultRequiredDomains: ["Security", "Architecture"],
    });

    assert.equal(coordinator.shouldHoldPr("task-1"), true);
    assert.equal(coordinator.shouldHoldPr("task-1", true), false);

    const state = coordinator.holdPr("task-1", 42);
    assert.equal(state.taskId, "task-1");
    assert.equal(state.prNumber, 42);
    assert.deepEqual(state.requiredDomains, ["Security", "Architecture"]);
    assert.equal(state.mergeApproved, false);
    assert.equal(state.synthesisCompleted, false);
  });

  it("should record domain check-ins and auto-approve when all domains approve", () => {
    const coordinator = new PrMergeGateCoordinator({
      defaultRequiredDomains: ["Security", "UX/UI"],
    });

    coordinator.holdPr("task-2", 101);

    assert.equal(coordinator.areAllDomainsCheckedIn("task-2"), false);
    assert.equal(coordinator.isMergeApproved("task-2"), false);

    // First check-in
    const recorded1 = coordinator.recordCheckIn("task-2", {
      domain: "Security",
      authorName: "SecurityBot",
      status: "APPROVED",
      feedbackNotes: "No security vulnerabilities detected in authentication flow.",
    });
    assert.equal(recorded1, true);
    assert.equal(coordinator.areAllDomainsCheckedIn("task-2"), false);
    assert.equal(coordinator.isMergeApproved("task-2"), false);

    // Second check-in
    const recorded2 = coordinator.recordCheckIn("task-2", {
      domain: "UX/UI",
      authorName: "UiEvaluator",
      status: "APPROVED",
      feedbackNotes: "Responsive mobile viewport layout verified.",
    });
    assert.equal(recorded2, true);
    assert.equal(coordinator.areAllDomainsCheckedIn("task-2"), true);
    assert.equal(coordinator.hasBlockingFeedback("task-2"), false);
    assert.equal(coordinator.isMergeApproved("task-2"), true);
  });

  it("should detect blocking feedback and prevent merge until synthesis completion", () => {
    const coordinator = new PrMergeGateCoordinator({
      defaultRequiredDomains: ["Security", "Architecture"],
    });

    coordinator.holdPr("task-3", 102);

    coordinator.recordCheckIn("task-3", {
      domain: "Security",
      authorName: "SecurityBot",
      status: "REQUEST_CHANGES",
      feedbackNotes: "Missing CSRF token validation on POST handler.",
    });

    coordinator.recordCheckIn("task-3", {
      domain: "Architecture",
      authorName: "ArchBot",
      status: "APPROVED",
      feedbackNotes: "Layering adheres to repository standards.",
    });

    assert.equal(coordinator.areAllDomainsCheckedIn("task-3"), true);
    assert.equal(coordinator.hasBlockingFeedback("task-3"), true);
    assert.equal(coordinator.isMergeApproved("task-3"), false);
    assert.equal(coordinator.isReadyForFinalSynthesis("task-3"), true);

    const prompt = coordinator.generateSynthesisPrompt("task-3");
    assert.ok(prompt.includes("PR #102"));
    assert.ok(prompt.includes("[Security] SecurityBot (REQUEST_CHANGES)"));
    assert.ok(prompt.includes("Missing CSRF token validation"));

    // Complete synthesis round and authorize merge
    coordinator.completeSynthesisAndApproveMerge("task-3");
    assert.equal(coordinator.isMergeApproved("task-3"), true);
    assert.equal(coordinator.isReadyForFinalSynthesis("task-3"), false);

    // Release state
    coordinator.releaseHeldState("task-3");
    assert.equal(coordinator.getHeldState("task-3"), undefined);
    assert.equal(coordinator.isMergeApproved("task-3"), true);
  });

  it("should fallback to approving merge if hold timeout expires", () => {
    // 50ms hold timeout
    const coordinator = new PrMergeGateCoordinator({
      defaultRequiredDomains: ["Security"],
      holdTimeoutMs: 50,
    });

    coordinator.holdPr("task-timeout", 200);
    assert.equal(coordinator.isMergeApproved("task-timeout"), false);

    // Simulate time passing by artificially mutating heldAt
    const state = coordinator.getHeldState("task-timeout");
    assert.ok(state);
    (state as { heldAt: number }).heldAt = Date.now() - 100;
    assert.equal(coordinator.isMergeApproved("task-timeout"), true);
  });

  it("should auto-approve merge immediately when requiredDomains is empty", () => {
    const coordinator = new PrMergeGateCoordinator();
    const state = coordinator.holdPr("task-empty-domains", 301, []);
    assert.equal(state.mergeApproved, true);
    assert.equal(state.synthesisCompleted, true);
    assert.equal(coordinator.areAllDomainsCheckedIn("task-empty-domains"), true);
    assert.equal(coordinator.isMergeApproved("task-empty-domains"), true);
  });

  it("should auto-approve merge when single active domain checks in approved", () => {
    const coordinator = new PrMergeGateCoordinator();
    const state = coordinator.holdPr("task-single-domain", 302, ["Security"]);
    assert.equal(state.mergeApproved, false);
    assert.equal(coordinator.isMergeApproved("task-single-domain"), false);

    coordinator.recordCheckIn("task-single-domain", {
      domain: "Security",
      authorName: "SecurityBot",
      status: "APPROVED",
      feedbackNotes: "No security issues detected.",
    });

    assert.equal(coordinator.areAllDomainsCheckedIn("task-single-domain"), true);
    assert.equal(coordinator.hasBlockingFeedback("task-single-domain"), false);
    assert.equal(coordinator.isMergeApproved("task-single-domain"), true);
  });
});

