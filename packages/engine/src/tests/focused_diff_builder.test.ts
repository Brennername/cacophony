import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FocusedDiffBuilder } from "../context/FocusedDiffBuilder.js";

describe("FocusedDiffBuilder Unit Tests", () => {
  const builder = new FocusedDiffBuilder();

  it("should generate a valid hunk for a simple change", () => {
    const orig = "line 1\nline 2\nline 3";
    const mod = "line 1\nline 2 modified\nline 3";

    const chunks = builder.computeTargetedChunks(orig, mod);
    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0]?.oldStartLine, 2);
    assert.strictEqual(chunks[0]?.newStartLine, 2);
    assert.deepStrictEqual(chunks[0]?.oldLines, ["line 2"]);
    assert.deepStrictEqual(chunks[0]?.newLines, ["line 2 modified"]);

    const diff = builder.formatUnifiedDiff("sample.txt", orig, mod);
    assert.ok(diff.includes("--- a/sample.txt"));
    assert.ok(diff.includes("+++ b/sample.txt"));
    assert.ok(diff.includes("-line 2"));
    assert.ok(diff.includes("+line 2 modified"));
  });

  it("should handle multiple changes", () => {
    const orig = "a\nb\nc\nd\ne\nf\ng";
    const mod = "a\nB_MOD\nc\nd\ne\nF_MOD\ng";

    const chunks = builder.computeTargetedChunks(orig, mod);
    assert.strictEqual(chunks.length, 2);
    assert.strictEqual(chunks[0]?.oldStartLine, 2);
    assert.deepStrictEqual(chunks[0]?.oldLines, ["b"]);
    assert.deepStrictEqual(chunks[0]?.newLines, ["B_MOD"]);

    assert.strictEqual(chunks[1]?.oldStartLine, 6);
    assert.deepStrictEqual(chunks[1]?.oldLines, ["f"]);
    assert.deepStrictEqual(chunks[1]?.newLines, ["F_MOD"]);
  });

  it("should handle a single line change", () => {
    const orig = "const x = 10;";
    const mod = "const x = 20;";

    const chunks = builder.computeTargetedChunks(orig, mod);
    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0]?.oldLineCount, 1);
    assert.strictEqual(chunks[0]?.newLineCount, 1);
    assert.deepStrictEqual(chunks[0]?.oldLines, ["const x = 10;"]);
    assert.deepStrictEqual(chunks[0]?.newLines, ["const x = 20;"]);
  });

  it("should handle empty input", () => {
    const chunks = builder.computeTargetedChunks("", "");
    assert.strictEqual(chunks.length, 0);

    const diff = builder.formatUnifiedDiff("empty.txt", "", "");
    assert.strictEqual(diff, "");
  });

  it("should handle a change with special characters", () => {
    const orig = "const regex = /^[a-z]+$/;";
    const mod = 'const regex = /^[a-z0-9_-]+$/; // with "quotes" & symbols <tag>';

    const chunks = builder.computeTargetedChunks(orig, mod);
    assert.strictEqual(chunks.length, 1);
    assert.deepStrictEqual(chunks[0]?.oldLines, [orig]);
    assert.deepStrictEqual(chunks[0]?.newLines, [mod]);
  });

  it("should handle a change at the beginning of the file", () => {
    const orig = "first line\nsecond line\nthird line";
    const mod = "FIRST LINE REPLACED\nsecond line\nthird line";

    const chunks = builder.computeTargetedChunks(orig, mod);
    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0]?.oldStartLine, 1);
    assert.strictEqual(chunks[0]?.newStartLine, 1);
    assert.deepStrictEqual(chunks[0]?.oldLines, ["first line"]);
    assert.deepStrictEqual(chunks[0]?.newLines, ["FIRST LINE REPLACED"]);
  });

  it("should handle a change with whitespace", () => {
    const orig = "  function test() {\n    return true;\n  }";
    const mod = "    function test() {\n      return true;\n    }";

    const chunks = builder.computeTargetedChunks(orig, mod);
    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0]?.oldLineCount, 3);
    assert.strictEqual(chunks[0]?.newLineCount, 3);
  });

  it("should handle a change with multiple lines", () => {
    const orig = "line 1\nline 2\nline 3\nline 4";
    const mod = "line 1\ninserted A\ninserted B\ninserted C\nline 4";

    const chunks = builder.computeTargetedChunks(orig, mod);
    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0]?.oldLineCount, 2);
    assert.strictEqual(chunks[0]?.newLineCount, 3);
    assert.deepStrictEqual(chunks[0]?.oldLines, ["line 2", "line 3"]);
    assert.deepStrictEqual(chunks[0]?.newLines, [
      "inserted A",
      "inserted B",
      "inserted C",
    ]);
  });

  it("should handle a change with only whitespace", () => {
    const orig = "const a = 1; \nconst b = 2;\t\n";
    const mod = "const a = 1;\nconst b = 2;\n";

    const chunks = builder.computeTargetedChunks(orig, mod);
    assert.ok(chunks.length > 0);
  });

  it("should handle a change with mixed case", () => {
    const orig = "const myVar = 'value';";
    const mod = "const MY_VAR = 'VALUE';";

    const chunks = builder.computeTargetedChunks(orig, mod);
    assert.strictEqual(chunks.length, 1);
    assert.deepStrictEqual(chunks[0]?.oldLines, [orig]);
    assert.deepStrictEqual(chunks[0]?.newLines, [mod]);
  });

  it("should handle a change at the end of the file", () => {
    const orig = "line 1\nline 2\nline 3";
    const mod = "line 1\nline 2\nline 3 modified end";

    const chunks = builder.computeTargetedChunks(orig, mod);
    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0]?.oldStartLine, 3);
    assert.strictEqual(chunks[0]?.newStartLine, 3);
    assert.deepStrictEqual(chunks[0]?.oldLines, ["line 3"]);
    assert.deepStrictEqual(chunks[0]?.newLines, ["line 3 modified end"]);
  });

  it("should build structured diff with additions and deletions count", () => {
    const orig = "unchanged\ndeleted 1\ndeleted 2\nunchanged end";
    const mod = "unchanged\nadded 1\nadded 2\nadded 3\nunchanged end";

    const structured = builder.buildStructuredDiff("sample.ts", orig, mod);
    assert.strictEqual(structured.filePath, "sample.ts");
    assert.strictEqual(structured.deletions, 2);
    assert.strictEqual(structured.additions, 3);
    assert.strictEqual(structured.hunks.length, 1);
    assert.strictEqual(structured.hunks[0]?.oldLines, 2);
    assert.strictEqual(structured.hunks[0]?.newLines, 3);
  });

  it("should build line-by-line diff using buildDiff", () => {
    const origLines = ["alpha", "beta", "gamma"];
    const modLines = ["alpha", "beta modified", "gamma", "delta"];

    const diffLines = builder.buildDiff(origLines, modLines);
    assert.ok(diffLines.includes("  alpha"));
    assert.ok(diffLines.includes("- beta"));
    assert.ok(diffLines.includes("+ beta modified"));
    assert.ok(diffLines.includes("  gamma"));
    assert.ok(diffLines.includes("+ delta"));
  });

  it("should support build convenience alias method", () => {
    const orig = "line 1\nline 2";
    const mod = "line 1\nline 2 mod";

    const diff = builder.build(orig, mod, "test.txt");
    assert.ok(diff.includes("--- a/test.txt"));
    assert.ok(diff.includes("+++ b/test.txt"));
  });
});
