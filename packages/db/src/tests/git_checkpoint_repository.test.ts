import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { GitCheckpointRepository } from "../repositories/GitCheckpointRepository.js";

describe("GitCheckpointRepository", () => {
  let driver: PGliteDriver;
  let repo: GitCheckpointRepository;

  beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    repo = new GitCheckpointRepository(driver);
  });

  afterEach(async () => {
    await driver.close();
  });

  test("should record and fetch the latest active checkpoint", async () => {
    await repo.recordCheckpoint({
      id: "cp-1",
      session_id: "sess-100",
      task_id: "task-200",
      commit_hash: "a1b2c3d4e5f678901234567890abcdef12345678",
      parent_hash: "0000000000000000000000000000000000000000",
      branch: "feature/arena-isolation",
      message: "feat: add initial worker isolation",
      files_changed_json: JSON.stringify(["packages/engine/src/isolation/Worker.ts"]),
      is_reverted: false,
    });

    const latest = await repo.getLatestCheckpoint("sess-100");
    assert.ok(latest);
    assert.equal(latest.id, "cp-1");
    assert.equal(latest.session_id, "sess-100");
    assert.equal(latest.commit_hash, "a1b2c3d4e5f678901234567890abcdef12345678");
    assert.equal(latest.is_reverted, false);
    assert.equal(latest.message, "feat: add initial worker isolation");
  });

  test("should track reverted checkpoints and retrieve latest reverted", async () => {
    await repo.recordCheckpoint({
      id: "cp-2",
      session_id: "sess-200",
      task_id: "task-300",
      commit_hash: "b2c3d4e5f678901234567890abcdef1234567890",
      parent_hash: "a1b2c3d4e5f678901234567890abcdef12345678",
      branch: "main",
      message: "feat: experimental method cache",
      files_changed_json: JSON.stringify(["packages/engine/src/Cache.ts"]),
      is_reverted: false,
    });

    let nonReverted = await repo.getLatestCheckpoint("sess-200");
    assert.ok(nonReverted);
    assert.equal(nonReverted.id, "cp-2");

    await repo.setReverted("cp-2", true);

    nonReverted = await repo.getLatestCheckpoint("sess-200");
    assert.equal(nonReverted, undefined);

    const reverted = await repo.getLatestRevertedCheckpoint("sess-200");
    assert.ok(reverted);
    assert.equal(reverted.id, "cp-2");
    assert.equal(reverted.is_reverted, true);
  });

  test("should list checkpoints with limit and session filtering", async () => {
    for (let i = 1; i <= 5; i++) {
      await repo.recordCheckpoint({
        id: `cp-batch-${i}`,
        session_id: "sess-filter",
        task_id: `task-${i}`,
        commit_hash: `hash-000000000000000000000000000000000000000${i}`,
        parent_hash: null,
        branch: "main",
        message: `commit ${i}`,
        files_changed_json: "[]",
        is_reverted: false,
      });
    }

    const listed = await repo.listCheckpoints("sess-filter", 3);
    assert.equal(listed.length, 3);
    assert.equal(listed[0]?.id, "cp-batch-5");

    const allInSession = await repo.listCheckpoints("sess-filter", 10);
    assert.equal(allInSession.length, 5);

    const otherSession = await repo.listCheckpoints("sess-other", 10);
    assert.equal(otherSession.length, 0);
  });
});
