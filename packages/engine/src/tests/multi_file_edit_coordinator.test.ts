import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import { MultiFileEditCoordinator } from "../context/MultiFileEditCoordinator.js";

describe("MultiFileEditCoordinator", () => {
  let coordinator: MultiFileEditCoordinator;
  let tempWorkspace: string;

  beforeEach(async () => {
    tempWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-multi-edit-"));
    coordinator = new MultiFileEditCoordinator();
  });

  afterEach(async () => {
    coordinator.discard();
    await fs.rm(tempWorkspace, { recursive: true, force: true });
  });

  describe("Staging and In-Memory Tracking", () => {
    test("should stage proposed edits and record existing file content", async () => {
      const relPath = "src/calculator.ts";
      const fullPath = path.join(tempWorkspace, relPath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, "export const PI = 3.14;", "utf-8");

      const proposed = "export const PI = 3.14159;\nexport const E = 2.718;";
      await coordinator.stage(tempWorkspace, relPath, proposed);

      const staged = coordinator.getStagedEdits();
      assert.equal(staged.length, 1);
      assert.equal(staged[0]!.relativePath, relPath);
      assert.equal(staged[0]!.originalContent, "export const PI = 3.14;");
      assert.equal(staged[0]!.proposedContent, proposed);
    });

    test("should stage new files with empty originalContent", async () => {
      const relPath = "src/brand_new.ts";
      const proposed = "export function hello(): string { return 'world'; }";
      await coordinator.stage(tempWorkspace, relPath, proposed);

      const staged = coordinator.getStagedEdits();
      assert.equal(staged.length, 1);
      assert.equal(staged[0]!.originalContent, "");
      assert.equal(staged[0]!.proposedContent, proposed);
    });
  });

  describe("Validation of Staged Edits", () => {
    test("should validate syntactically correct TypeScript files", async () => {
      await coordinator.stage(
        tempWorkspace,
        "src/a.ts",
        "export function add(a: number, b: number): number { return a + b; }",
      );
      await coordinator.stage(
        tempWorkspace,
        "src/b.ts",
        "export interface User { id: string; }",
      );

      const result = coordinator.validateStaged();
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
      assert.equal(result.stagedFiles.length, 2);
    });

    test("should detect syntax errors in malformed TypeScript code", async () => {
      await coordinator.stage(
        tempWorkspace,
        "src/broken.ts",
        "export function broken() { return a + ; }",
      );

      const result = coordinator.validateStaged();
      assert.equal(result.valid, false);
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors[0]!.includes("src/broken.ts syntax error"));
    });
  });

  describe("Atomic Application to Disk", () => {
    test("should write all valid staged edits to disk and clear staging area", async () => {
      const fileA = "src/moduleA.ts";
      const fileB = "src/sub/moduleB.ts";

      await coordinator.stage(tempWorkspace, fileA, "export const A = 10;");
      await coordinator.stage(tempWorkspace, fileB, "export const B = 20;");

      const applied = await coordinator.applyToDisk(tempWorkspace);
      assert.equal(applied.length, 2);
      assert.ok(applied.includes(fileA));
      assert.ok(applied.includes(fileB));

      const contentA = await fs.readFile(path.join(tempWorkspace, fileA), "utf-8");
      const contentB = await fs.readFile(path.join(tempWorkspace, fileB), "utf-8");
      assert.equal(contentA, "export const A = 10;");
      assert.equal(contentB, "export const B = 20;");

      // Staging area should be empty after applying
      assert.equal(coordinator.getStagedEdits().length, 0);
    });

    test("should reject applyToDisk when validation errors are present", async () => {
      await coordinator.stage(
        tempWorkspace,
        "src/invalid.ts",
        "export class Unclosed {",
      );

      await assert.rejects(
        async () => {
          await coordinator.applyToDisk(tempWorkspace);
        },
        /Cannot commit staged edits to disk due to validation errors/,
      );
    });

    test("should discard all staged edits on discard", async () => {
      await coordinator.stage(tempWorkspace, "src/discardMe.ts", "export const X = 1;");
      assert.equal(coordinator.getStagedEdits().length, 1);

      coordinator.discard();
      assert.equal(coordinator.getStagedEdits().length, 0);
    });
  });
});