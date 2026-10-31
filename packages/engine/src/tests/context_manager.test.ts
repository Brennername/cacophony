import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { ContextManager } from "../context/ContextManager.js";

describe("ContextManager", () => {
  it("should add editable and reference files with estimated token counts", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-ctx-test-"));
    try {
      const filePath = path.join(tmpDir, "sample.ts");
      await fs.writeFile(filePath, "const x = 1234;".repeat(20)); // ~320 bytes => ~80 tokens

      const manager = new ContextManager({ modelWindowTokens: 4000 });
      const entry = await manager.addFile(tmpDir, "sample.ts", "EDITABLE");

      assert.equal(entry.path, "sample.ts");
      assert.equal(entry.mode, "EDITABLE");
      assert.ok(entry.estimatedTokens > 0);

      const files = manager.getFiles();
      assert.equal(files.length, 1);
      assert.equal(files[0]?.path, "sample.ts");
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("should filter files by EDITABLE and REFERENCE modes", async () => {
    const manager = new ContextManager();
    await manager.addFile("/virtual", "fileA.ts", "EDITABLE");
    await manager.addFile("/virtual", "fileB.ts", "REFERENCE");
    await manager.addFile("/virtual", "fileC.ts", "EDITABLE");

    const all = manager.getFiles();
    assert.equal(all.length, 3);

    const editable = manager.getFiles("EDITABLE");
    assert.equal(editable.length, 2);
    assert.ok(editable.every((f) => f.mode === "EDITABLE"));

    const reference = manager.getFiles("REFERENCE");
    assert.equal(reference.length, 1);
    assert.equal(reference[0]?.path, "fileB.ts");
  });

  it("should update file mode and drop files from active context", async () => {
    const manager = new ContextManager();
    await manager.addFile("/virtual", "service.ts", "EDITABLE");

    const updated = manager.setMode("service.ts", "REFERENCE");
    assert.equal(updated, true);

    const files = manager.getFiles("REFERENCE");
    assert.equal(files.length, 1);

    const dropped = manager.dropFile("service.ts");
    assert.equal(dropped, true);
    assert.equal(manager.getFiles().length, 0);

    const dropAgain = manager.dropFile("service.ts");
    assert.equal(dropAgain, false);
  });

  it("should clear all files", async () => {
    const manager = new ContextManager();
    await manager.addFile("/virtual", "1.ts");
    await manager.addFile("/virtual", "2.ts");
    assert.equal(manager.getFiles().length, 2);

    manager.clear();
    assert.equal(manager.getFiles().length, 0);
  });

  it("should emit capacity warning when active context exceeds 60% token threshold", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-ctx-cap-"));
    try {
      const largeFile = path.join(tmpDir, "large.ts");
      // 4000 bytes => ~1000 tokens
      await fs.writeFile(largeFile, "A".repeat(4000));

      const manager = new ContextManager({
        modelWindowTokens: 1000,
        maxTokensThreshold: 500, // 500 tokens threshold
      });

      await manager.addFile(tmpDir, "large.ts", "EDITABLE");

      assert.equal(manager.isNearTokenCapacity(), true);
      const warning = manager.getCapacityWarning();
      assert.ok(warning);
      assert.ok(warning.includes("exceeds 60% of model window"));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
