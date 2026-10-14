import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { PrettierFormattingScrubberRule } from "../scrubber/rules/PrettierFormattingScrubberRule.js";
import { IncrementalClassMerger } from "../context/IncrementalClassMerger.js";

describe("T98.1.4: Code Remediation Indentation & Newline Preservation", () => {
  const rule = new PrettierFormattingScrubberRule();

  it("should normalize CRLF to LF and ensure exactly one EOF newline", () => {
    const inputWithCrlf = "export class A {\r\n  run(): void {\r\n    return;\r\n  }\r\n}\r\n\r\n";
    const result = rule.scrub(inputWithCrlf, "test.ts");

    assert.strictEqual(result.modified, true);
    assert.ok(!result.content.includes("\r\n"), "Must convert all CRLF to LF");
    assert.ok(result.content.endsWith("}\n"), "Must end with single trailing newline");
    assert.ok(!result.content.endsWith("}\n\n"), "Must not have multiple trailing newlines");
  });

  it("should preserve existing method indentation when merging incremental class modifications", () => {
    const original = [
      "export class Worker {",
      "  public existingMethod(): void {",
      "    const value = 42;",
      "    return value;",
      "  }",
      "}",
    ].join("\n");

    const generated = [
      "export class Worker {",
      "  public newMethod(): string {",
      "    return 'new';",
      "  }",
      "}",
    ].join("\n");

    const merged = IncrementalClassMerger.merge(original, generated);

    // Both methods must exist and keep their indentation structure
    assert.ok(merged.includes("public existingMethod(): void {"));
    assert.ok(merged.includes("    const value = 42;"));
    assert.ok(merged.includes("public newMethod(): string {"));
    assert.ok(merged.includes("    return 'new';"));
  });

  it("should strip trailing whitespace from lines without altering indentation", () => {
    const input = "  const a = 1;   \n    const b = 2;\t  \n";
    const result = rule.scrub(input, "clean.ts");

    assert.strictEqual(result.modified, true);
    const lines = result.content.split("\n");
    assert.strictEqual(lines[0], "  const a = 1;");
    assert.strictEqual(lines[1], "    const b = 2;");
  });
});
