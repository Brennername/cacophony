import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { SQLiteDriver } from "../drivers/SQLiteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { DocCommentCandidateRepository } from "../repositories/DocCommentCandidateRepository.js";

describe("T-S13.3: DocCommentCandidateRepository and Migration 024", () => {
  let driver: SQLiteDriver;
  let candidateRepo: DocCommentCandidateRepository;

  before(async () => {
    driver = new SQLiteDriver(":memory:");
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    candidateRepo = new DocCommentCandidateRepository(driver);
  });

  after(async () => {
    await driver.close();
  });

  test("should create and retrieve candidates for a function ordered by creation date", async () => {
    const c1 = await candidateRepo.createCandidate({
      functionIdentifier: "calculateMetrics",
      filePath: "src/analytics/metrics.ts",
      candidateText: "/**\n * Calculates aggregate system metrics.\n */",
      userGuidance: undefined,
      modelId: "qwen2.5-coder:7b",
      createdAt: "2026-11-01T10:00:00.000Z",
    });

    const c2 = await candidateRepo.createCandidate({
      functionIdentifier: "calculateMetrics",
      filePath: "src/analytics/metrics.ts",
      candidateText: "/**\n * Computes decoupling score and throughput.\n */",
      userGuidance: "explain decoupling score",
      modelId: "qwen2.5-coder:7b",
      createdAt: "2026-11-01T10:05:00.000Z",
    });

    assert.equal(c1.status, "PENDING");
    assert.equal(c2.status, "PENDING");

    const candidates = await candidateRepo.getCandidatesForFunction(
      "src/analytics/metrics.ts",
      "calculateMetrics",
    );

    assert.equal(candidates.length, 2);
    // Should be descending by created_at
    assert.equal(candidates[0]?.id, c2.id);
    assert.equal(candidates[1]?.id, c1.id);
  });

  test("should accept candidate and automatically discard remaining pending candidates", async () => {
    const candidates = await candidateRepo.getCandidatesForFunction(
      "src/analytics/metrics.ts",
      "calculateMetrics",
    );
    const target = candidates[0];
    assert.ok(target);

    const accepted = await candidateRepo.acceptCandidate(target.id);
    assert.ok(accepted);
    assert.equal(accepted.status, "ACCEPTED");
    assert.ok(accepted.acceptedAt);

    // Verify target is ACCEPTED and the other candidate transitioned to DISCARDED
    const updatedCandidates = await candidateRepo.getCandidatesForFunction(
      "src/analytics/metrics.ts",
      "calculateMetrics",
    );
    const updatedTarget = updatedCandidates.find((c) => c.id === target.id);
    const otherCandidate = updatedCandidates.find((c) => c.id !== target.id);

    assert.equal(updatedTarget?.status, "ACCEPTED");
    assert.equal(otherCandidate?.status, "DISCARDED");
    assert.ok(otherCandidate?.discardedAt);
  });

  test("should prune discarded candidates older than retention threshold and preserve accepted", async () => {
    // Insert an old discarded candidate (10 days ago)
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    await candidateRepo.createCandidate({
      id: "old-discarded-1",
      functionIdentifier: "processPayload",
      filePath: "src/network/parser.ts",
      candidateText: "/** Draft */",
      status: "DISCARDED",
      modelId: "qwen2.5-coder:7b",
      createdAt: tenDaysAgo,
    });

    // Mark discarded_at explicitly
    await driver.execute(
      `UPDATE doc_comment_candidates SET discarded_at = ? WHERE id = ?`,
      [tenDaysAgo, "old-discarded-1"],
    );

    // Insert a fresh candidate discarded today
    await candidateRepo.createCandidate({
      id: "fresh-discarded-2",
      functionIdentifier: "processPayload",
      filePath: "src/network/parser.ts",
      candidateText: "/** Fresh draft */",
      status: "DISCARDED",
      modelId: "qwen2.5-coder:7b",
    });

    // Run pruning with 7 day retention
    const prunedCount = await candidateRepo.pruneDiscardedCandidates(7);
    assert.ok(prunedCount >= 1);

    // Verify old candidate was pruned, fresh discarded candidate remains, accepted remains
    const oldCandidate = await candidateRepo.getCandidateById("old-discarded-1");
    assert.equal(oldCandidate, null);

    const freshCandidate = await candidateRepo.getCandidateById("fresh-discarded-2");
    assert.ok(freshCandidate);

    const acceptedCandidates = await candidateRepo.getCandidatesForFunction(
      "src/analytics/metrics.ts",
      "calculateMetrics",
    );
    assert.ok(acceptedCandidates.some((c) => c.status === "ACCEPTED"));
  });
});
