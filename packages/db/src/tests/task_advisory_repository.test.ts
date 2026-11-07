import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { SQLiteDriver } from "../drivers/SQLiteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { TaskAdvisoryRepository } from "../repositories/TaskAdvisoryRepository.js";

describe("T-S13.4: TaskAdvisoryRepository and Migration 025", () => {
  let driver: SQLiteDriver;
  let advisoryRepo: TaskAdvisoryRepository;

  before(async () => {
    driver = new SQLiteDriver(":memory:");
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    advisoryRepo = new TaskAdvisoryRepository(driver);
  });

  after(async () => {
    await driver.close();
  });

  test("should record operator guidance on a task and retrieve it chronologically", async () => {
    const g1 = await advisoryRepo.createGuidance({
      taskId: "task-arena-101",
      author: "Operator",
      commentText: "Ensure decoupled architecture with zero emoji usage.",
      advisoryType: "CONSTRAINT",
      requiresComplianceAudit: true,
      createdAt: "2026-11-06T12:00:00.000Z",
    });

    const g2 = await advisoryRepo.createGuidance({
      taskId: "task-arena-101",
      author: "Operator",
      commentText: "Add unit tests verifying memory leak prevention.",
      advisoryType: "RECOMMENDATION",
      requiresComplianceAudit: true,
      createdAt: "2026-11-06T12:05:00.000Z",
    });

    assert.ok(g1.id);
    assert.equal(g1.advisoryType, "CONSTRAINT");
    assert.equal(g1.requiresComplianceAudit, true);

    const guidanceList = await advisoryRepo.getGuidanceForTask("task-arena-101");
    assert.equal(guidanceList.length, 2);
    assert.equal(guidanceList[0]?.id, g1.id);
    assert.equal(guidanceList[1]?.id, g2.id);

    const hasGuidance = await advisoryRepo.hasAdvisoryGuidance("task-arena-101");
    assert.equal(hasGuidance, true);

    const hasNoGuidance = await advisoryRepo.hasAdvisoryGuidance("nonexistent-task");
    assert.equal(hasNoGuidance, false);
  });

  test("should delete guidance record prior to task dispatch", async () => {
    const g = await advisoryRepo.createGuidance({
      taskId: "task-arena-102",
      author: "Operator",
      commentText: "Temporary comment to be removed",
      advisoryType: "INSTRUCTION",
    });

    const beforeDelete = await advisoryRepo.getGuidanceById(g.id);
    assert.ok(beforeDelete);

    const deleted = await advisoryRepo.deleteGuidance(g.id);
    assert.equal(deleted, true);

    const afterDelete = await advisoryRepo.getGuidanceById(g.id);
    assert.equal(afterDelete, null);
  });
});
