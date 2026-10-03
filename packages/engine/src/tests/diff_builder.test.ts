import { describe, it } from "node:test";
import assert from "node:assert";
import { FocusedDiffBuilder } from "../context/FocusedDiffBuilder.js";

describe("FocusedDiffBuilder Test Suite", () => {
  const diffBuilder = new FocusedDiffBuilder();

  it("should compute line-level array diffs accurately", () => {
    const originalLines = ["line1", "line2", "line3"];
    const modifiedLines = ["line1", "modified line2", "line3", "line4"];

    const expectedDiff = [
      "  line1",
      "- line2",
      "+ modified line2",
      "  line3",
      "+ line4"
    ];

    const result = diffBuilder.buildDiff(originalLines, modifiedLines);
    assert.deepStrictEqual(result, expectedDiff);
  });

  it("should compute targeted chunks for modified lines", () => {
    const original = "function add(a, b) {\n  return a + b;\n}\n";
    const modified = "function add(a, b) {\n  const sum = a + b;\n  return sum;\n}\n";

    const chunks = diffBuilder.computeTargetedChunks(original, modified);
    assert.ok(chunks.length > 0, "Chunks should be generated for diff");
    assert.strictEqual(chunks[0]!.oldStartLine, 2);
  });

  it("should generate valid unified diff format string", () => {
    const original = "export const x = 1;\n";
    const modified = "export const x = 2;\n";

    const diff = diffBuilder.formatUnifiedDiff("src/constants.ts", original, modified);
    assert.ok(diff.startsWith("--- a/src/constants.ts"));
    assert.ok(diff.includes("+++ b/src/constants.ts"));
    assert.ok(diff.includes("-export const x = 1;"));
    assert.ok(diff.includes("+export const x = 2;"));
  });

  it("should handle new file creation diff format", () => {
    const diff = diffBuilder.formatUnifiedDiff("src/new.ts", "", "console.log(1);\n");
    assert.ok(diff.includes("--- a/src/new.ts"));
    assert.ok(diff.includes("+++ b/src/new.ts"));
    assert.ok(diff.includes("+console.log(1);"));
  });

  it("should construct structured UnifiedDiff object with hunks and additions/deletions", () => {
    const original = "alpha\nbeta\n";
    const modified = "alpha\ngamma\n";

    const structured = diffBuilder.buildStructuredDiff("src/letters.ts", original, modified);
    assert.strictEqual(structured.filePath, "src/letters.ts");
    assert.strictEqual(structured.hunks.length, 1);
    assert.strictEqual(structured.deletions, 1);
    assert.strictEqual(structured.additions, 1);
  });
});
