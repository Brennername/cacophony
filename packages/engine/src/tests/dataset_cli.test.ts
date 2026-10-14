import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runDatasetMigrateCommand } from "../cli/datasetCommand.js";

describe("Dataset CLI Test Suite (T71.1.3)", () => {
  it("prints help and returns 0 when called with --help or no args", async () => {
    const exitCodeHelp = await runDatasetMigrateCommand(["--help"]);
    assert.equal(exitCodeHelp, 0);

    const exitCodeNoArgs = await runDatasetMigrateCommand([]);
    assert.equal(exitCodeNoArgs, 0);
  });

  it("returns 1 when migrate subcommand is invoked without --dir", async () => {
    const exitCode = await runDatasetMigrateCommand(["migrate"]);
    assert.equal(exitCode, 1);
  });

  it("returns 1 when an invalid subcommand is passed", async () => {
    const exitCode = await runDatasetMigrateCommand(["unknown-subcommand"]);
    assert.equal(exitCode, 1);
  });

  it("successfully migrates dataset directory via --dir=<path> argument", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-arena-dataset-"));
    try {
      const completedDir = path.join(tempDir, "completed");
      fs.mkdirSync(completedDir, { recursive: true });
      fs.writeFileSync(
        path.join(completedDir, "sample-task.json"),
        JSON.stringify({ id: "sample-1", prompt: "Hello world" }),
        "utf-8",
      );

      const exitCode = await runDatasetMigrateCommand([
        "migrate",
        `--dir=${tempDir}`,
      ]);

      assert.equal(exitCode, 0, "CLI migration should exit with code 0");

      const manifestPath = path.join(tempDir, "manifest.json");
      assert.ok(fs.existsSync(manifestPath), "manifest.json should be created");

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      assert.equal(manifest.version, "2.0.0");
      assert.equal(manifest.totalTasks, 1);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
