import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { LspDiagnosticRepository } from "../repositories/LspDiagnosticRepository.js";

describe("LspDiagnosticRepository", () => {
  let driver: PGliteDriver;
  let repo: LspDiagnosticRepository;

  beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    repo = new LspDiagnosticRepository(driver);
  });

  afterEach(async () => {
    await driver.close();
  });

  test("should insert and query diagnostics by task id ordered by line", async () => {
    await repo.insert({
      id: "diag-1",
      task_id: "task-101",
      uri: "file:///workspace/packages/engine/src/Server.ts",
      line: 42,
      character: 5,
      severity: "Error",
      code: "TS2304",
      source: "typescript",
      message: "Cannot find name 'unknownSymbol'",
    });

    await repo.insert({
      id: "diag-2",
      task_id: "task-101",
      uri: "file:///workspace/packages/engine/src/Server.ts",
      line: 12,
      character: 1,
      severity: "Warning",
      code: "TS6133",
      source: "typescript",
      message: "'unusedVar' is declared but its value is never read",
    });

    const diagnostics = await repo.getByTaskId("task-101");
    assert.equal(diagnostics.length, 2);
    assert.equal(diagnostics[0]?.id, "diag-2");
    assert.equal(diagnostics[0]?.line, 12);
    assert.equal(diagnostics[0]?.severity, "Warning");
    assert.equal(diagnostics[1]?.id, "diag-1");
    assert.equal(diagnostics[1]?.line, 42);
    assert.equal(diagnostics[1]?.code, "TS2304");
  });

  test("should query diagnostics by file uri", async () => {
    await repo.insert({
      id: "diag-file-a-1",
      task_id: "task-202",
      uri: "file:///workspace/packages/engine/src/App.ts",
      line: 10,
      character: 2,
      severity: "Error",
      code: "TS2322",
      source: "typescript",
      message: "Type 'string' is not assignable to type 'number'",
    });

    await repo.insert({
      id: "diag-file-b-1",
      task_id: "task-202",
      uri: "file:///workspace/packages/engine/src/Other.ts",
      line: 5,
      character: 0,
      severity: "Information",
      code: null,
      source: "eslint",
      message: "Missing JSDoc comment",
    });

    const appDiags = await repo.getByUri("file:///workspace/packages/engine/src/App.ts");
    assert.equal(appDiags.length, 1);
    assert.equal(appDiags[0]?.id, "diag-file-a-1");
    assert.equal(appDiags[0]?.message, "Type 'string' is not assignable to type 'number'");

    const otherDiags = await repo.getByUri("file:///workspace/packages/engine/src/Other.ts");
    assert.equal(otherDiags.length, 1);
    assert.equal(otherDiags[0]?.id, "diag-file-b-1");

    const nonExistent = await repo.getByUri("file:///workspace/packages/engine/src/Missing.ts");
    assert.equal(nonExistent.length, 0);
  });
});
