import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { SQLiteDriver } from "../drivers/SQLiteDriver.js";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { ReviewReportRepository } from "../repositories/ReviewReportRepository.js";
import type { StructuredAssessmentReport } from "@cacophony/shared-types";

describe("T88.3.3: ReviewReportRepository Persistence Across Assessment Rounds", () => {
  describe("SQLiteDriver In-Memory", () => {
    let driver: SQLiteDriver;
    let repo: ReviewReportRepository;

    before(async () => {
      driver = new SQLiteDriver(":memory:");
      await driver.connect();
      repo = new ReviewReportRepository(driver);
    });

    after(async () => {
      await driver.close();
    });

    test("should save and retrieve structured assessment report for round 1", async () => {
      const report: StructuredAssessmentReport = {
        id: "rep-001",
        workItemId: "wi-8801",
        round: 1,
        prId: 42,
        prUrl: "http://localhost:19634/NeXeN/cacophony/pulls/42",
        headSha: "commit-sha-v1",
        modelIdentity: "deepseek-r1:8b",
        verdict: "REQUEST_CHANGES",
        summary: "Found unhandled null check in data pipeline",
        findings: [
          {
            id: "find-101",
            path: "src/pipeline.ts",
            lineNumber: 45,
            category: "correctness",
            severity: "critical",
            message: "Missing null safety check on incoming payload",
            rationale: "Unchecked access could cause runtime TypeError",
            deterministicFixHint: "payload?.data ?? null",
          },
        ],
        testEvidence: "Tests passing with 1 warning",
        ciOutcome: "success",
        createdAt: new Date().toISOString(),
      };

      const saved = await repo.saveReport(report);
      assert.strictEqual(saved.id, "rep-001");
      assert.strictEqual(saved.round, 1);

      const retrieved = await repo.getById("rep-001");
      assert.ok(retrieved);
      assert.strictEqual(retrieved?.id, "rep-001");
      assert.strictEqual(retrieved?.verdict, "REQUEST_CHANGES");
      assert.strictEqual(retrieved?.findings.length, 1);
      assert.strictEqual(retrieved?.findings[0]?.category, "correctness");
      assert.strictEqual(retrieved?.findings[0]?.severity, "critical");

      const latestRound = await repo.getLatestRound("wi-8801");
      assert.strictEqual(latestRound, 1);
    });

    test("should start fresh round when head SHA changes and retain earlier reports for audit", async () => {
      // Assessor 2 on round 1
      const report2: StructuredAssessmentReport = {
        id: "rep-002",
        workItemId: "wi-8801",
        round: 1,
        prId: 42,
        headSha: "commit-sha-v1",
        modelIdentity: "qwen2.5-coder:14b",
        verdict: "REQUEST_CHANGES",
        summary: "Concurring with critical finding",
        findings: [],
        createdAt: new Date().toISOString(),
      };
      await repo.saveReport(report2);

      // Fix committed, resulting in fresh headSha: commit-sha-v2, starting Round 2
      const reportRound2: StructuredAssessmentReport = {
        id: "rep-003",
        workItemId: "wi-8801",
        round: 2,
        prId: 42,
        headSha: "commit-sha-v2",
        modelIdentity: "deepseek-r1:8b",
        verdict: "APPROVE",
        summary: "Null check implemented cleanly according to SOLID principles",
        findings: [],
        ciOutcome: "success",
        createdAt: new Date().toISOString(),
      };
      await repo.saveReport(reportRound2);

      const latestRound = await repo.getLatestRound("wi-8801");
      assert.strictEqual(latestRound, 2, "Latest round should be 2");

      const round1Reports = await repo.getReportsForRound("wi-8801", 1);
      assert.strictEqual(round1Reports.length, 2, "Round 1 must retain both audit reports");

      const round2Reports = await repo.getReportsForRound("wi-8801", 2);
      assert.strictEqual(round2Reports.length, 1, "Round 2 must have 1 report");
      assert.strictEqual(round2Reports[0]?.verdict, "APPROVE");

      const allReports = await repo.listReports("wi-8801");
      assert.strictEqual(allReports.length, 3, "Historical audit must retain all 3 reports");

      const modelReport = await repo.getReportByWorkItemAndModel("wi-8801", 2, "deepseek-r1:8b");
      assert.ok(modelReport);
      assert.strictEqual(modelReport?.id, "rep-003");
    });
  });

  describe("PGliteDriver In-Memory", () => {
    let driver: PGliteDriver;
    let repo: ReviewReportRepository;

    before(async () => {
      driver = new PGliteDriver();
      await driver.connect();
      repo = new ReviewReportRepository(driver);
    });

    after(async () => {
      await driver.close();
    });

    test("should persist and query structured reports with ON CONFLICT on PGlite", async () => {
      const report: StructuredAssessmentReport = {
        id: "rep-pg-001",
        workItemId: "wi-pg-99",
        round: 1,
        prId: 101,
        headSha: "sha-pg-v1",
        modelIdentity: "deepseek-r1:8b",
        verdict: "APPROVE",
        summary: "Verified architecture and security compliance",
        findings: [],
        ciOutcome: "success",
        createdAt: new Date().toISOString(),
      };

      await repo.saveReport(report);

      const fetched = await repo.getById("rep-pg-001");
      assert.ok(fetched);
      assert.strictEqual(fetched?.workItemId, "wi-pg-99");
      assert.strictEqual(fetched?.verdict, "APPROVE");

      const latestRound = await repo.getLatestRound("wi-pg-99");
      assert.strictEqual(latestRound, 1);
    });
  });
});
