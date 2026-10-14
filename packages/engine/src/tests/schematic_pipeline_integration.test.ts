import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { AutonomousWorkerPipeline } from "../scheduler/AutonomousWorkerPipeline.js";

describe("SchematicPipelineIntegration", () => {
  let tempDir: string;
  let pipeline: AutonomousWorkerPipeline;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "schematic-test-"));
    // Minimal pipeline instance for helper methods
    pipeline = new AutonomousWorkerPipeline({
      workspaceRoot: tempDir,
      ollamaProvider: {} as any,
      contextMinimizer: {} as any,
      parser: {} as any,
      ruleEngine: {} as any,
    });
  });

  after(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe("ensureSkeletonExists (T70.3.1)", () => {
    it("synthesizes and writes Angular standalone component skeleton when file does not exist", async () => {
      const targetRel = "packages/frontend/src/app/components/profile.component.ts";
      const prompt = "Create an Angular component for user profile management";

      const skeleton = await pipeline.ensureSkeletonExists(targetRel, tempDir, prompt);

      assert.ok(skeleton);
      assert.ok(skeleton.includes("ProfileComponent"));
      assert.ok(skeleton.includes("@angular/core"));
      assert.ok(skeleton.includes("ngOnInit"));

      const diskPath = path.resolve(tempDir, targetRel);
      const onDisk = await fs.readFile(diskPath, "utf-8");
      assert.equal(onDisk, skeleton);
    });

    it("synthesizes scrubber rule skeleton when target path references rule or scrubber", async () => {
      const targetRel = "packages/engine/src/rules/EmojiScrubberRule.ts";
      const prompt = "Scrubber rule to eliminate emojis from code output";

      const skeleton = await pipeline.ensureSkeletonExists(targetRel, tempDir, prompt);

      assert.ok(skeleton);
      assert.ok(skeleton.includes("EmojiScrubberRule"));
      assert.ok(skeleton.includes("ScrubberRule"));
      assert.ok(skeleton.includes("scrub(source: string, filePath: string): ScrubberResult"));

      const diskPath = path.resolve(tempDir, targetRel);
      const onDisk = await fs.readFile(diskPath, "utf-8");
      assert.equal(onDisk, skeleton);
    });

    it("synthesizes http route handler skeleton when target references handler", async () => {
      const targetRel = "packages/engine/src/routes/HealthHandler.ts";
      const prompt = "Route handler for health probes";

      const skeleton = await pipeline.ensureSkeletonExists(targetRel, tempDir, prompt);

      assert.ok(skeleton);
      assert.ok(skeleton.includes("HealthHandler"));
      assert.ok(skeleton.includes("canHandle"));
      assert.ok(skeleton.includes("handle"));

      const diskPath = path.resolve(tempDir, targetRel);
      const onDisk = await fs.readFile(diskPath, "utf-8");
      assert.equal(onDisk, skeleton);
    });

    it("does not overwrite an existing file with non-empty content", async () => {
      const targetRel = "packages/engine/src/existing.ts";
      const diskPath = path.resolve(tempDir, targetRel);
      await fs.mkdir(path.dirname(diskPath), { recursive: true });
      await fs.writeFile(diskPath, "export const EXISTING_DATA = 42;", "utf-8");

      const result = await pipeline.ensureSkeletonExists(targetRel, tempDir, "Any prompt");
      assert.equal(result, "export const EXISTING_DATA = 42;");

      const onDisk = await fs.readFile(diskPath, "utf-8");
      assert.equal(onDisk, "export const EXISTING_DATA = 42;");
    });
  });

  describe("mergeSlotFill (T70.3.2)", () => {
    it("successfully verifies and merges valid slot implementation into scaffold", () => {
      const scaffold = [
        "export class ComputeService {",
        "  public execute(): void {",
        "    /* AST_METHOD_STUB: execute */",
        "  }",
        "}",
      ].join("\n");

      const rawModelOutput = [
        "// <BEGIN_IMPLEMENTATION>",
        "    const count = 10;",
        "    const total = count * 2;",
        "    console.log(total);",
        "// <END_IMPLEMENTATION>",
      ].join("\n");

      const result = pipeline.mergeSlotFill(
        scaffold,
        rawModelOutput,
        "packages/engine/src/ComputeService.ts",
      );

      assert.equal(result.valid, true);
      assert.ok(result.mergedCode.includes("const total = count * 2;"));
      assert.ok(!result.mergedCode.includes("/* AST_METHOD_STUB: execute */"));
    });

    it("rejects invalid slot-fill syntax failing AST validation", () => {
      const scaffold = [
        "export class SyntaxCheck {",
        "  public execute(): void {",
        "    /* AST_METHOD_STUB: execute */",
        "  }",
        "}",
      ].join("\n");

      const invalidOutput = [
        "// <BEGIN_IMPLEMENTATION>",
        "    const badSyntax = {{{ ;",
        "// <END_IMPLEMENTATION>",
      ].join("\n");

      const result = pipeline.mergeSlotFill(
        scaffold,
        invalidOutput,
        "packages/engine/src/SyntaxCheck.ts",
      );

      assert.equal(result.valid, false);
      assert.ok(result.error);
    });

    it("rejects empty slot implementation", () => {
      const scaffold = "export class EmptyCheck { execute() {} }";
      const emptyOutput = "// <BEGIN_IMPLEMENTATION>\n\n// <END_IMPLEMENTATION>";

      const result = pipeline.mergeSlotFill(
        scaffold,
        emptyOutput,
        "packages/engine/src/EmptyCheck.ts",
      );

      assert.equal(result.valid, false);
      assert.equal(result.error, "Extracted slot body is empty");
    });
  });
});
