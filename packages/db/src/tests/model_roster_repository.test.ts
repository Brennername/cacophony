import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { ModelRosterRepository } from "../repositories/ModelRosterRepository.js";

describe("ModelRosterRepository Test Suite", () => {
  let driver: PGliteDriver;
  let repo: ModelRosterRepository;

  before(async () => {
    driver = new PGliteDriver();
    await driver.connect();

    const runner = new MigrationRunner(driver);
    await runner.migrate();

    repo = new ModelRosterRepository(driver);
  });

  after(async () => {
    await driver.close();
  });

  test("should insert new roster and bullpen models", async () => {
    const rosterItem = await repo.upsert({
      modelId: "deepseek-coder-v2:16b",
      tier: "ROSTER",
      roles: ["implementer", "reviewer"],
      concurrencyLimit: 2,
      isProtected: true,
      notes: "Primary workhorse",
    });

    assert.equal(rosterItem.modelId, "deepseek-coder-v2:16b");
    assert.equal(rosterItem.tier, "ROSTER");
    assert.deepEqual(rosterItem.roles, ["implementer", "reviewer"]);
    assert.equal(rosterItem.concurrencyLimit, 2);
    assert.equal(rosterItem.isProtected, true);

    const bullpenItem = await repo.upsert({
      modelId: "phi4",
      tier: "BULLPEN",
      roles: ["architect", "reasoning"],
      notes: "Staged for evaluation",
    });

    assert.equal(bullpenItem.modelId, "phi4");
    assert.equal(bullpenItem.tier, "BULLPEN");
    assert.deepEqual(bullpenItem.roles, ["architect", "reasoning"]);
  });

  test("should retrieve active roster and bullpen separately", async () => {
    const roster = await repo.getActiveRoster();
    assert.equal(roster.length, 1);
    assert.equal(roster[0]!.modelId, "deepseek-coder-v2:16b");

    const bullpen = await repo.getActiveBullpen();
    assert.equal(bullpen.length, 1);
    assert.equal(bullpen[0]!.modelId, "phi4");
  });

  test("should filter models by role correctly", async () => {
    await repo.upsert({
      modelId: "qwen2.5-coder:7b-instruct-q4_K_M",
      tier: "ROSTER",
      roles: ["reviewer", "triage"],
    });

    const implementers = await repo.getModelsForRole("implementer");
    assert.deepEqual(implementers, ["deepseek-coder-v2:16b"]);

    const reviewers = await repo.getModelsForRole("reviewer");
    assert.ok(reviewers.includes("deepseek-coder-v2:16b"));
    assert.ok(reviewers.includes("qwen2.5-coder:7b-instruct-q4_K_M"));
  });

  test("should promote a model from bullpen to roster", async () => {
    const promoted = await repo.upsert({
      modelId: "phi4",
      tier: "ROSTER",
      roles: ["architect", "reasoning", "reviewer"],
      notes: "Promoted after successful evaluation",
    });

    assert.equal(promoted.tier, "ROSTER");
    assert.deepEqual(promoted.roles, ["architect", "reasoning", "reviewer"]);

    const bullpen = await repo.getActiveBullpen();
    assert.equal(bullpen.length, 0);

    const roster = await repo.getActiveRoster();
    assert.equal(roster.length, 3);
  });

  test("should delete a model cleanly", async () => {
    await repo.delete("phi4");
    const found = await repo.getByModelId("phi4");
    assert.equal(found, null);
  });
});
